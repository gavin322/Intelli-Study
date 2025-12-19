import { http } from './http';

export const fetchProfile = () => http.get('/users/me').then((res) => res.data);
