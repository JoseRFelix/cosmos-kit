import { AssetList, Chain } from '@chain-registry/types';
import { EndpointOptions, LogLevel, MainWalletBase, ModalViews, NameServiceName, SessionOptions, SignerOptions, WalletConnectOptions, WalletModalProps } from '@cosmos-kit/core';
import { ReactNode } from 'react';
export declare const ChainProvider: ({ chains, assetLists, wallets, walletModal, modalTheme, modalViews, wrappedWithChakra, defaultNameService, walletConnectOptions, signerOptions, endpointOptions, sessionOptions, logLevel, children, }: {
    chains: Chain[];
    assetLists: AssetList[];
    wallets: MainWalletBase[];
    walletModal?: (props: WalletModalProps) => JSX.Element;
    modalTheme?: Record<string, any>;
    modalViews?: ModalViews;
    wrappedWithChakra?: boolean;
    defaultNameService?: NameServiceName;
    walletConnectOptions?: WalletConnectOptions;
    signerOptions?: SignerOptions;
    endpointOptions?: EndpointOptions;
    sessionOptions?: SessionOptions;
    logLevel?: LogLevel;
    children: ReactNode;
}) => JSX.Element;
