import { expect } from '#test-expect';
import { JSDOM } from 'jsdom';
import { test } from 'node:test';
import { EquipmentCard } from '../src/view/equipment-card.js';

test('shows equipment identity and hides cleanly', () => {
  const dom = new JSDOM('<main></main>');
  const host = dom.window.document.querySelector('main')!;
  const card = new EquipmentCard(host as unknown as HTMLElement);
  card.show({
    selectionId: 'ice3-virtual-auto-plant/equipment/ROBOT-201',
    name: '点焊机器人',
    tag: 'ROBOT-201',
    stage: '车身焊装',
    area: '焊装车间',
    connectionCount: 4,
  });
  expect(card.element.hidden).toBe(false);
  expect(card.element.textContent).toContain('点焊机器人');
  expect(card.element.textContent).toContain('ROBOT-201');
  expect(card.element.textContent).toContain('4 条连接');
  card.show(null);
  expect(card.element.hidden).toBe(true);
});
