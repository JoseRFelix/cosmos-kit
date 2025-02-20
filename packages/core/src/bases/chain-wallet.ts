import {
  CosmWasmClient,
  HttpEndpoint,
  SigningCosmWasmClient,
  SigningCosmWasmClientOptions,
} from '@cosmjs/cosmwasm-stargate';
import { EncodeObject, OfflineSigner } from '@cosmjs/proto-signing';
import {
  calculateFee,
  GasPrice,
  SigningStargateClient,
  SigningStargateClientOptions,
  StargateClient,
  StargateClientOptions,
  StdFee,
} from '@cosmjs/stargate';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { NameService } from '../name-service';

import {
  ChainRecord,
  CosmosClientType,
  SignType,
  SimpleAccount,
  State,
  Wallet,
} from '../types';
import { getNameServiceRegistryFromChainName, isValidEndpoint } from '../utils';
import { WalletBase } from './wallet';

export class ChainWalletBase extends WalletBase {
  protected _chainRecord: ChainRecord;
  rpcEndpoints?: (string | HttpEndpoint)[];
  restEndpoints?: (string | HttpEndpoint)[];
  protected _rpcEndpoint?: string | HttpEndpoint;
  protected _restEndpoint?: string | HttpEndpoint;
  offlineSigner?: OfflineSigner;
  namespace = 'cosmos';

  constructor(walletInfo: Wallet, chainRecord: ChainRecord) {
    super(walletInfo);
    this._chainRecord = chainRecord;
    this.rpcEndpoints = chainRecord.preferredEndpoints?.rpc;
    this.restEndpoints = chainRecord.preferredEndpoints?.rest;
  }

  get appUrl() {
    return this.client?.appUrl;
  }

  get qrUrl() {
    return this.client?.qrUrl;
  }

  get chainRecord() {
    return this._chainRecord;
  }

  get chainName() {
    return this.chainRecord.name;
  }

  get chainLogoUrl(): string | undefined {
    return (
      // until chain_registry fix this
      // this.chainInfo.chain.logo_URIs?.svg ||
      // this.chainInfo.chain.logo_URIs?.png ||
      // this.chainInfo.chain.logo_URIs?.jpeg ||
      this.chainRecord.assetList?.assets[0]?.logo_URIs?.svg ||
      this.chainRecord.assetList?.assets[0]?.logo_URIs?.png ||
      undefined
    );
  }

  get stargateOptions(): StargateClientOptions | undefined {
    return this.chainRecord.clientOptions?.stargate;
  }

  get signingStargateOptions(): SigningStargateClientOptions | undefined {
    return (
      this.chainRecord.clientOptions?.signingStargate ||
      this.chainRecord.clientOptions?.stargate
    );
  }

  get signingCosmwasmOptions(): SigningCosmWasmClientOptions | undefined {
    return this.chainRecord.clientOptions?.signingCosmwasm;
  }

  get preferredSignType(): SignType {
    return this.chainRecord.clientOptions?.preferredSignType || 'amino';
  }

  get chain() {
    return this.chainRecord.chain;
  }

  get assets() {
    return this.chainRecord.assetList?.assets;
  }

  get assetList() {
    return this.chainRecord.assetList;
  }

  get chainId() {
    return this.chain?.chain_id;
  }

  get cosmwasmEnabled() {
    return this.chain?.codebase?.cosmwasm_enabled;
  }

  get username(): string | undefined {
    return this.data?.username;
  }

  get address(): string | undefined {
    return this.data?.address;
  }

  setData(data: SimpleAccount | undefined) {
    this._mutable.data = data;
    this.actions?.data?.(data);
    const accountsStr = window.localStorage.getItem(
      'cosmos-kit@1:core//accounts'
    );
    let accounts: SimpleAccount[] = accountsStr ? JSON.parse(accountsStr) : [];
    if (typeof data === 'undefined') {
      accounts = accounts.filter(
        (a) => a.chainId !== this.chainId || a.namespace !== this.namespace
      );
    } else {
      accounts = accounts.filter(
        (a) => a.chainId !== this.chainId || a.namespace !== this.namespace
      );
      accounts.push(data);
    }

    window?.localStorage.setItem(
      'cosmos-kit@1:core//accounts',
      JSON.stringify(accounts)
    );
    this.session?.update();
  }

  initClient(options?: any): void | Promise<void> {
    throw new Error('initClient not implemented');
  }

  async update() {
    this.setState(State.Pending);
    this.setMessage(void 0);

    try {
      await this.client.connect?.(this.chainId);

      let account: SimpleAccount;
      try {
        this.logger?.debug(
          `Fetching ${this.walletName} ${this.chainId} account.`
        );
        account = await this.client.getSimpleAccount(this.chainId);
      } catch (error) {
        if (this.rejectMatched(error as Error)) {
          this.setRejected();
          return;
        }
        if (this.client.addChain) {
          await this.client.addChain(this.chainRecord);
          account = await this.client.getSimpleAccount(this.chainId);
        } else {
          throw error;
        }
      }

      this.setData(account);
      this.setState(State.Done);
      this.setMessage(void 0);
    } catch (e) {
      this.logger?.error(e);
      if (e && this.rejectMatched(e as Error)) {
        this.setRejected();
      } else {
        this.setError(e as Error);
      }
    }
    if (!this.isWalletRejected) {
      window?.localStorage.setItem(
        'cosmos-kit@1:core//current-wallet',
        this.walletName
      );
    }
  }

  getRpcEndpoint = async (isLazy?: boolean): Promise<string | HttpEndpoint> => {
    if (isLazy) {
      const endpoint = this._rpcEndpoint || this.rpcEndpoints?.[0];
      if (!endpoint) {
        throw new Error(
          `No available RPC endpoint for chain ${this.chainName} in ${this.walletName}!`
        );
      } else {
        return endpoint;
      }
    }

    if (
      this._rpcEndpoint &&
      (await isValidEndpoint(this._rpcEndpoint, this.logger))
    ) {
      return this._rpcEndpoint;
    }
    for (const endpoint of this.rpcEndpoints || []) {
      if (await isValidEndpoint(endpoint, this.logger)) {
        this._rpcEndpoint = endpoint;
        this.logger?.debug('Using RPC endpoint ' + endpoint);
        return endpoint;
      }
    }
    throw new Error(
      `No valid RPC endpoint for chain ${this.chainName} in ${this.walletName}!`
    );
  };

  getRestEndpoint = async (
    isLazy?: boolean
  ): Promise<string | HttpEndpoint> => {
    if (isLazy) {
      const endpoint = this._restEndpoint || this.restEndpoints?.[0];
      if (!endpoint) {
        throw new Error(
          `No available REST endpoint for chain ${this.chainName} in ${this.walletName}!`
        );
      } else {
        return endpoint;
      }
    }

    if (
      this._restEndpoint &&
      (await isValidEndpoint(this._restEndpoint, this.logger))
    ) {
      return this._restEndpoint;
    }
    for (const endpoint of this.restEndpoints || []) {
      if (await isValidEndpoint(endpoint, this.logger)) {
        this._restEndpoint = endpoint;
        this.logger?.debug('Using REST endpoint ' + endpoint);
        return endpoint;
      }
    }
    throw new Error(
      `No valid Rest endpoint for chain ${this.chainName} in ${this.walletName}!`
    );
  };

  getStargateClient = async (): Promise<StargateClient> => {
    const rpcEndpoint = await this.getRpcEndpoint();
    return StargateClient.connect(rpcEndpoint, this.stargateOptions);
  };

  getCosmWasmClient = async (): Promise<CosmWasmClient> => {
    const rpcEndpoint = await this.getRpcEndpoint();
    return CosmWasmClient.connect(rpcEndpoint);
  };

  getNameService = async (): Promise<NameService> => {
    const client = await this.getCosmWasmClient();
    const registry = getNameServiceRegistryFromChainName(this.chainName);
    return new NameService(client, registry);
  };

  async initOfflineSigner() {
    if (typeof this.client === 'undefined') {
      throw new Error('WalletClient is not initialized');
    }
    this.offlineSigner = await this.client.getOfflineSigner(
      this.chainId,
      this.preferredSignType
    );
  }

  getSigningStargateClient = async (): Promise<SigningStargateClient> => {
    const rpcEndpoint = await this.getRpcEndpoint();

    if (!this.offlineSigner) {
      await this.initOfflineSigner();
    }

    return SigningStargateClient.connectWithSigner(
      rpcEndpoint,
      this.offlineSigner,
      this.signingStargateOptions
    );
  };

  getSigningCosmWasmClient = async (): Promise<SigningCosmWasmClient> => {
    const rpcEndpoint = await this.getRpcEndpoint();

    if (!this.offlineSigner) {
      await this.initOfflineSigner();
    }

    return SigningCosmWasmClient.connectWithSigner(
      rpcEndpoint,
      this.offlineSigner,
      this.signingCosmwasmOptions
    );
  };

  protected getSigningClient = async (type?: CosmosClientType) => {
    switch (type) {
      case 'stargate':
        return await this.getSigningStargateClient();
      case 'cosmwasm':
        return await this.getSigningCosmWasmClient();
      default:
        return this.getSigningStargateClient();
    }
  };

  estimateFee = async (
    messages: EncodeObject[],
    type?: CosmosClientType,
    memo?: string,
    multiplier?: number
  ) => {
    if (!this.address) {
      throw new Error(
        'Address is required to estimate fee. Try connect to fetch address.'
      );
    }

    let gasPrice: GasPrice | undefined;
    switch (type) {
      case 'stargate':
        gasPrice = this.signingStargateOptions?.gasPrice;
        break;
      case 'cosmwasm':
        gasPrice = this.signingCosmwasmOptions?.gasPrice;
        break;
      default:
        gasPrice = this.signingStargateOptions?.gasPrice;
        break;
    }

    if (!gasPrice) {
      throw new Error(
        'Gas price must be set in the client options when auto gas is used.'
      );
    }
    const client = await this.getSigningClient(type);
    const gasEstimation = await client.simulate(this.address, messages, memo);
    return calculateFee(
      Math.round(gasEstimation * (multiplier || 1.3)),
      gasPrice
    );
  };

  sign = async (
    messages: EncodeObject[],
    fee?: StdFee | number,
    memo?: string,
    type?: CosmosClientType
  ): Promise<TxRaw> => {
    if (!this.address) {
      throw new Error(
        'Address is required to estimate fee. Try connect to fetch address.'
      );
    }
    const client = await this.getSigningClient(type);
    let usedFee: StdFee;
    if (typeof fee === 'undefined' || typeof fee === 'number') {
      usedFee = await this.estimateFee(messages, type, memo, fee);
    } else {
      usedFee = fee;
    }

    return await client.sign(this.address, messages, usedFee, memo || '');
  };

  broadcast = async (signedMessages: TxRaw, type?: CosmosClientType) => {
    const client = await this.getSigningClient(type);
    const txBytes = TxRaw.encode(signedMessages).finish();

    let timeoutMs: number | undefined, pollIntervalMs: number | undefined;
    switch (type) {
      case 'stargate':
        timeoutMs = this.signingStargateOptions?.broadcastTimeoutMs;
        pollIntervalMs = this.signingStargateOptions?.broadcastPollIntervalMs;
        break;
      case 'cosmwasm':
        timeoutMs = this.signingCosmwasmOptions?.broadcastTimeoutMs;
        pollIntervalMs = this.signingCosmwasmOptions?.broadcastPollIntervalMs;
        break;
      default:
        timeoutMs = this.signingStargateOptions?.broadcastTimeoutMs;
        pollIntervalMs = this.signingStargateOptions?.broadcastPollIntervalMs;
        break;
    }

    return client.broadcastTx(txBytes, timeoutMs, pollIntervalMs);
  };

  signAndBroadcast = async (
    messages: EncodeObject[],
    fee?: StdFee | number,
    memo?: string,
    type?: CosmosClientType
  ) => {
    const signedMessages = await this.sign(messages, fee, memo, type);
    return this.broadcast(signedMessages, type);
  };
}
