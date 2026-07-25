import type { Rpc, SimulateTransactionApi } from '@solana/rpc';
import type { Commitment, Slot } from '@solana/rpc-types';
import { TransactionMessage, TransactionMessageWithFeePayer } from '@solana/transaction-messages';
type EstimateResourceLimitsFactoryConfig = Readonly<{
    rpc: Rpc<SimulateTransactionApi>;
}>;
type EstimateResourceLimitsConfig = Readonly<{
    abortSignal?: AbortSignal;
    commitment?: Commitment;
    minContextSlot?: Slot;
}>;
/**
 * The estimated resource limits for a transaction message.
 *
 * `computeUnitLimit` is always returned. For version 1 transaction messages,
 * `loadedAccountsDataSizeLimit` is also required. For legacy and version 0 messages, the
 * `loadedAccountsDataSizeLimit` is returned when the RPC includes it in the simulation result,
 * but is not required — callers that don't apply it can ignore the field.
 */
export type ResourceLimitsEstimate<TTransactionMessage extends TransactionMessage> = TTransactionMessage extends {
    version: 1;
} ? {
    computeUnitLimit: number;
    loadedAccountsDataSizeLimit: number;
} : {
    computeUnitLimit: number;
    loadedAccountsDataSizeLimit?: number;
};
type EstimateResourceLimitsFunction = <TTransactionMessage extends TransactionMessage & TransactionMessageWithFeePayer>(transactionMessage: TTransactionMessage, config?: EstimateResourceLimitsConfig) => Promise<ResourceLimitsEstimate<TTransactionMessage>>;
/**
 * Returns a function that estimates the resource limits required by a transaction message by
 * simulating it.
 *
 * The estimator sets the compute unit limit to the maximum (1,400,000) and the loaded accounts data
 * size limit to the maximum (64 MiB) before simulating, so the simulation does not fail due to
 * resource exhaustion. For blockhash-lifetime transactions, the RPC is asked to replace the
 * blockhash during simulation, so any blockhash value will work. For durable nonce transactions,
 * the actual nonce value is used.
 *
 * For version 1 transaction messages, both `computeUnitLimit` and `loadedAccountsDataSizeLimit` are
 * returned. The function throws if the RPC does not return a `loadedAccountsDataSize` value, since
 * this value is required for version 1 transactions. For legacy and version 0 messages, only
 * `computeUnitLimit` is returned.
 *
 * @param factoryConfig - An object containing the RPC instance to use for simulation.
 * @return A function that accepts a transaction message and returns the estimated resource limits.
 *
 * @example
 * ```ts
 * import { estimateResourceLimitsFactory } from '@solana/kit';
 *
 * const estimateResourceLimits = estimateResourceLimitsFactory({ rpc });
 * const { computeUnitLimit, loadedAccountsDataSizeLimit } = await estimateResourceLimits(transactionMessage);
 * ```
 */
export declare function estimateResourceLimitsFactory({ rpc, }: EstimateResourceLimitsFactoryConfig): EstimateResourceLimitsFunction;
/**
 * Returns a function that estimates the resource limits for a transaction message and sets them on
 * the message.
 *
 * For all versions, the compute unit limit is updated to the estimated value if it is not already
 * set to an explicit, non-provisory value. The compute unit limit also treats the maximum
 * (1,400,000) as non-explicit, so messages that pre-set the max for simulation get re-estimated.
 *
 * For version 1 messages, the loaded accounts data size limit is updated only if it is unset or set
 * to the provisory value of 0. An explicit value — including the runtime maximum — is left
 * untouched, since callers who set it explicitly are signaling a deliberate choice.
 *
 * This is designed to work with {@link fillTransactionMessageProvisoryResourceLimits}: first add
 * provisory limits during transaction construction, then later estimate and replace them before
 * sending.
 *
 * @param estimateResourceLimits - The estimator function, typically created by
 *   {@link estimateResourceLimitsFactory}. You can also pass a custom wrapper that applies a buffer
 *   to the returned values.
 * @return A function that accepts a transaction message and returns it with resource limits set to
 *   the estimated values.
 *
 * @example
 * ```ts
 * import { estimateAndSetResourceLimitsFactory, estimateResourceLimitsFactory } from '@solana/kit';
 *
 * const estimator = estimateResourceLimitsFactory({ rpc });
 * const estimateAndSet = estimateAndSetResourceLimitsFactory(estimator);
 * const updatedMessage = await estimateAndSet(transactionMessage);
 * ```
 */
export declare function estimateAndSetResourceLimitsFactory(estimateResourceLimits: EstimateResourceLimitsFunction): <TTransactionMessage extends TransactionMessage & TransactionMessageWithFeePayer>(transactionMessage: TTransactionMessage, config?: EstimateResourceLimitsConfig) => Promise<TTransactionMessage>;
/**
 * Sets resource limits to a provisory value of 0 if no limit is currently set on the transaction
 * message.
 *
 * For all versions, this fills the compute unit limit. For version 1 messages, it also fills the
 * loaded accounts data size limit. If a limit is already set (any value, including 0), that limit
 * is left unchanged.
 *
 * This is useful during transaction construction to reserve space for resource limits that will
 * later be replaced with actual estimates via {@link estimateAndSetResourceLimitsFactory}.
 *
 * @param transactionMessage - The transaction message to add provisory limits to.
 * @return The transaction message with provisory resource limits set, or unchanged if all
 *   applicable limits were already present.
 *
 * @example
 * ```ts
 * import { fillTransactionMessageProvisoryResourceLimits } from '@solana/kit';
 *
 * const messageWithProvisoryLimits = fillTransactionMessageProvisoryResourceLimits(transactionMessage);
 * ```
 */
export declare function fillTransactionMessageProvisoryResourceLimits<TTransactionMessage extends TransactionMessage>(transactionMessage: TTransactionMessage): TTransactionMessage;
export {};
//# sourceMappingURL=resource-limit-estimation.d.ts.map