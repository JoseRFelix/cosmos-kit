import { StdSignature, StdSignDoc } from '@cosmjs/amino';
import { Algo, OfflineDirectSigner } from '@cosmjs/proto-signing';
import { BroadcastMode, SignType } from '@cosmos-kit/core';
import { DirectSignDoc, SignOptions, WalletClient } from '@cosmos-kit/core';

import { XDEFI } from './types';

export class XDEFIClient implements WalletClient {
  readonly client: XDEFI;

  constructor(client: XDEFI) {
    this.client = client;
  }

  async enable(chainIds: string | string[]) {
    await this.client.enable(chainIds);
  }

  async disconnect() {
    await this.client?.disconnect?.();
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
    const key = await this.client.getKey(chainId);
    return {
      username: key.name,
      address: key.bech32Address,
      algo: key.algo as Algo,
      pubkey: key.pubKey,
    };
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
    // return this.client.getOfflineSignerAuto(chainId);
  }

  getOfflineSignerAmino(chainId: string) {
    return this.client.getOfflineSignerOnlyAmino(chainId);
  }

  getOfflineSignerDirect(chainId: string) {
    return this.client.getOfflineSigner(chainId) as OfflineDirectSigner;
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions?: SignOptions
  ) {
    return await this.client.signAmino(chainId, signer, signDoc, signOptions);
  }

  async signDirect(
    chainId: string,
    signer: string,
    signDoc: DirectSignDoc,
    signOptions?: SignOptions
  ) {
    return await this.client.signDirect(chainId, signer, signDoc, signOptions);
  }

  async signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array
  ): Promise<StdSignature> {
    return await this.client.signArbitrary(chainId, signer, data);
  }

  async sendTx(chainId: string, tx: Uint8Array, mode: BroadcastMode) {
    return await this.client.sendTx(chainId, tx, mode);
  }
}
