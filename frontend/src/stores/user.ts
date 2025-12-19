import { defineStore } from 'pinia';

interface UserState {
  token: string | null;
  profile: { email: string; displayName?: string } | null;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem('token'),
    profile: null
  }),
  actions: {
    setToken(token: string) {
      this.token = token;
      localStorage.setItem('token', token);
    },
    setProfile(profile: UserState['profile']) {
      this.profile = profile;
    },
    clear() {
      this.token = null;
      this.profile = null;
      localStorage.removeItem('token');
    }
  }
});
