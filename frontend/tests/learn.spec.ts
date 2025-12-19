import { mount } from '@vue/test-utils';
import LearnPage from '@/pages/learn/LearnPage.vue';

describe('LearnPage', () => {
  it('renders header text', () => {
    const wrapper = mount(LearnPage);
    expect(wrapper.text()).toContain('单词学习');
  });
});
