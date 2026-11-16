// Minimal types for @paystack/inline-js, which ships without declarations.
// Covers only the API used by the campaign order page.
declare module "@paystack/inline-js" {
  export interface PaystackTransaction {
    reference: string;
    trans?: string;
    status?: string;
    message?: string;
    transaction?: string;
    trxref?: string;
  }

  export interface PaystackError {
    message?: string;
  }

  export interface NewTransactionOptions {
    key: string;
    email: string;
    /** Amount in kobo */
    amount: number;
    reference?: string;
    currency?: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: PaystackError) => void;
  }

  export default class PaystackPop {
    constructor();
    newTransaction(options: NewTransactionOptions): void;
  }
}
