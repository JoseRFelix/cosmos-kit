import { Chain } from '@chain-registry/types';
import {
  HttpEndpoint,
  SigningCosmWasmClientOptions,
} from '@cosmjs/cosmwasm-stargate';
import {
  SigningStargateClientOptions,
  StargateClientOptions,
} from '@cosmjs/stargate';

import { ChainName } from './chain';
import { Dispatch, SignType, StateActions } from './common';
import { WalletName } from './wallet';

export interface SignerOptions {
  stargate?: (chain: Chain) => StargateClientOptions | undefined;
  signingStargate?: (chain: Chain) => SigningStargateClientOptions | undefined;
  signingCosmwasm?: (chain: Chain) => SigningCosmWasmClientOptions | undefined;
  preferredSignType?: (chain: Chain) => SignType | undefined; // using `amino` if undefined
}

export interface ViewOptions {
  alwaysOpenView?: boolean;
  closeViewWhenWalletIsConnected?: boolean;
  closeViewWhenWalletIsDisconnected?: boolean;
  closeViewWhenWalletIsRejected?: boolean;
}

export interface StorageOptions {
  disabled?: boolean;
  duration?: number; // ms
  clearOnTabClose?: boolean;
}

export interface SessionOptions {
  duration: number; // ms
  callback?: () => void;
}

export interface Endpoints {
  rpc?: (string | HttpEndpoint)[];
  rest?: (string | HttpEndpoint)[];
}

export type EndpointOptions = Record<ChainName, Endpoints>;

export interface ManagerActions<T> extends StateActions<T> {
  walletName?: Dispatch<WalletName | undefined>;
  chainName?: Dispatch<ChainName | undefined>;
  viewOpen?: Dispatch<boolean>;
}

export type EventName = 'refresh_connection';
