import { getPublicClient } from '@wagmi/core';
import { wagmiConfig } from '../wagmi';

// inside submitAndWait
const publicClient = getPublicClient(wagmiConfig, { chainId: cid });
const nonce = await publicClient.getTransactionCount({ address });
const gas = await publicClient.estimateContractGas({ ...params, account: address });
const request = await publicClient.prepareTransactionRequest({ ...params, account: address, nonce, gas });

// then writeContractAsync(request)
