import { FACTORY_QUICK_ACTION_GROUPS as QUICK_ACTION_GROUPS } from '../../shared/factory-scenarios.js';

export type { FactoryQuickAction as QuickAction } from '../../shared/factory-scenarios.js';

export function createQuickActions(
  container: HTMLElement,
  onSelect: (prompt: string) => void,
): HTMLElement {
  const document = container.ownerDocument;
  const navigation = document.createElement('nav');
  navigation.className = 'quick-actions';
  navigation.setAttribute('aria-label', '快捷指令');
  for (const group of QUICK_ACTION_GROUPS) {
    const section = document.createElement('div');
    section.className = 'quick-action-group';
    section.setAttribute('role', 'group');
    section.setAttribute('aria-label', group.label);

    const label = document.createElement('span');
    label.className = 'quick-action-group__label';
    label.textContent = group.label;

    const items = document.createElement('div');
    items.className = 'quick-action-group__items';
    for (const action of group.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => onSelect(action.prompt));
      items.append(button);
    }
    section.append(label, items);
    navigation.append(section);
  }
  container.prepend(navigation);
  return navigation;
}
