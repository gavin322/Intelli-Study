import { http } from './http';

export const fetchTimeline = () => http.get('/history/timeline').then((res) => res.data);

export const fetchErrors = () => http.get('/history/errors').then((res) => res.data);
