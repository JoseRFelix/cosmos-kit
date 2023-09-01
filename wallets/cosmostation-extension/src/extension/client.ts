import { chainRegistryChainToCosmostation } from '@chain-registry/cosmostation';
import { StdSignature, StdSignDoc } from '@cosmjs/amino';
import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import {
  BroadcastMode,
  ChainRecord,
  DirectSignDoc,
  ExtendedHttpEndpoint,
  SignOptions,
  SignType,
  SuggestToken,
  WalletClient,
} from '@cosmos-kit/core';

import { Cosmostation, RequestAccountResponse } from './types';

export class CosmostationClient implements WalletClient {
  readonly client: Cosmostation;
  private eventMap: Map<
    string,
    Map<EventListenerOrEventListenerObject, Event>
  > = new Map();

  constructor(client: Cosmostation) {
    this.client = client;
  }

  get cosmos() {
    return this.client.cosmos;
  }

  get ikeplr() {
    return this.client.providers.keplr;
  }

  async suggestToken({ chainName, tokens, type }: SuggestToken) {
    if (type === 'cw20') {
      await this.cosmos.request({
        method: 'cos_addTokensCW20',
        params: {
          chainName,
          tokens,
        },
      });
    }
  }

  async getSimpleAccount(chainId: string) {
    const { address, username } = await this.getAccount(chainId);
    return {
      namespace: 'cosmos',
      chainId,
      address,
      username,
    };
  }

  async getAccount(chainId: string) {
    const key = (await this.cosmos.request({
      method: 'cos_requestAccount',
      params: { chainName: chainId },
    })) as RequestAccountResponse;
    return {
      username: key.name,
      address: key.address,
      pubkey: key.publicKey,
      algo: key.algo,
    };
  }

  async disconnect() {
    await this.cosmos.request({
      method: 'cos_disconnect',
    });
  }

  on(type: string, listener: EventListenerOrEventListenerObject): void {
    const event = this.cosmos.on(type, listener);
    const typeEventMap: Map<EventListenerOrEventListenerObject, Event> =
      this.eventMap.get(type) || new Map();
    typeEventMap.set(listener, event);
    this.eventMap.set(type, typeEventMap);
  }

  off(type: string, listener: EventListenerOrEventListenerObject): void {
    const event = this.eventMap.get(type)?.get(listener);
    if (event) {
      this.cosmos.off(event);
    }
  }

  getOfflineSigner(chainId: string, preferredSignType?: SignType) {
    switch (preferredSignType) {
      case 'amino':
        return this.getOfflineSignerAmino(chainId);
      case 'direct':
        return this.getOfflineSignerDirect(chainId);
      default:
        return this.getOfflineSignerAmino(chainId);
    }
    // return this.ikeplr.getOfflineSignerAuto(chainId);
  }

  getOfflineSignerAmino(chainId: string) {
    return this.ikeplr.getOfflineSignerOnlyAmino(chainId);
  }

  getOfflineSignerDirect(chainId: string) {
    return this.ikeplr.getOfflineSigner(chainId) as OfflineDirectSigner;
  }

  async addChain(chainInfo: ChainRecord) {
    const suggestChain = chainRegistryChainToCosmostation(
      chainInfo.chain,
      chainInfo.assetList ? [chainInfo.assetList] : []
    );
    if (chainInfo.preferredEndpoints?.rest?.[0]) {
      (suggestChain.restURL as string | ExtendedHttpEndpoint) =
        chainInfo.preferredEndpoints?.rest?.[0];
    }
    const result = (await this.cosmos.request({
      method: 'cos_addChain',
      params: suggestChain,
    })) as boolean;

    if (!result) {
      throw new Error(`Failed to add chain ${chainInfo.name}.`);
    }
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions?: SignOptions
  ) {
    try {
      return await this.ikeplr.signAmino(chainId, signer, signDoc, signOptions);
    } catch (error) {
      return await this.cosmos.request({
        method: 'cos_signAmino',
        params: {
          chainName: chainId,
          doc: signDoc,
          isEditMemo: signOptions?.preferNoSetMemo,
          isEditFee: signOptions?.preferNoSetFee,
        },
      });
    }
  }

  async signDirect(
    chainId: string,
    signer: string,
    signDoc: DirectSignDoc,
    signOptions?: SignOptions
  ) {
    try {
      return await this.ikeplr.signDirect(
        chainId,
        signer,
        signDoc,
        signOptions
      );
    } catch (error) {
      return await this.cosmos.request({
        method: 'cos_signDirect',
        params: {
          chainName: chainId,
          doc: signDoc,
          isEditMemo: signOptions?.preferNoSetMemo,
          isEditFee: signOptions?.preferNoSetFee,
        },
      });
    }
  }

  async signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array
  ): Promise<StdSignature> {
    try {
      return await this.ikeplr.signArbitrary(chainId, signer, data);
    } catch (error) {
      // https://github.com/cosmostation/cosmostation-chrome-extension-client/blob/main/src/cosmos.ts#LL70C17-L70C28
      const message =
        typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
      return await this.cosmos.request({
        method: 'cos_signMessage',
        params: {
          chainName: chainId,
          signer,
          message,
        },
      });
    }
  }

  async sendTx(chainId: string, tx: Uint8Array, mode: BroadcastMode) {
    return await this.ikeplr.sendTx(chainId, tx, mode);
  }
}
