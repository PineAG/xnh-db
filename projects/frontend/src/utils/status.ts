export type LoadingStatusBase<T> = {status: 'pending'} | {status: 'success', data: T} | {status: 'failed', message: string}

