import { Algo } from '@cosmjs/amino';
import { DirectSignResponse } from '@cosmjs/proto-signing';
import { Wallet } from '@cosmos-kit/core';
import { WCClient } from '@cosmos-kit/walletconnect';

export class KeplrClient extends WCClient {
  constructor(walletInfo: Wallet) {
    super(walletInfo);
  }
}
