/**
 * Deterministic seed menu for the mock provider.
 *
 * Small but structurally representative (categories, items, a single-select and
 * a multi-select modifier group, an unavailable item) so contract and unit
 * tests exercise real shapes. Values are illustrative, NOT a real AnTeNa menu —
 * the authoritative menu arrives via SpotOn in D3.
 */

import { Money } from '@/shared/money';

import type { ProviderMenu } from '../domain/menu';

const usd = (decimal: string) => Money.fromDecimal(decimal, 'USD').toJSON();

export const MOCK_MENU_VERSION = 'mock-menu-v1';

export function buildMockMenu(retrievedAt: string): ProviderMenu {
  return {
    menuVersion: MOCK_MENU_VERSION,
    retrievedAt,
    categories: [
      { categoryId: 'cat_starters', name: 'Starters' },
      { categoryId: 'cat_mains', name: 'Mains' },
    ],
    items: [
      {
        itemId: 'item_calamari',
        name: 'Crispy Calamari',
        categoryId: 'cat_starters',
        basePrice: usd('14.00'),
        available: true,
        modifierGroups: [],
      },
      {
        itemId: 'item_garden_salad',
        name: 'Garden Salad',
        categoryId: 'cat_starters',
        basePrice: usd('11.00'),
        available: true,
        modifierGroups: [
          {
            groupId: 'grp_dressing',
            name: 'Dressing',
            minSelections: 1,
            maxSelections: 1,
            modifiers: [
              { modifierId: 'mod_ranch', name: 'Ranch', priceDelta: usd('0.00'), available: true },
              {
                modifierId: 'mod_balsamic',
                name: 'Balsamic',
                priceDelta: usd('0.00'),
                available: true,
              },
            ],
          },
        ],
      },
      {
        itemId: 'item_salmon',
        name: 'Grilled Salmon',
        categoryId: 'cat_mains',
        basePrice: usd('28.00'),
        available: true,
        modifierGroups: [
          {
            groupId: 'grp_temp',
            name: 'Temperature',
            minSelections: 1,
            maxSelections: 1,
            modifiers: [
              {
                modifierId: 'mod_medium',
                name: 'Medium',
                priceDelta: usd('0.00'),
                available: true,
              },
              {
                modifierId: 'mod_well',
                name: 'Well done',
                priceDelta: usd('0.00'),
                available: true,
              },
            ],
          },
          {
            groupId: 'grp_addons',
            name: 'Add-ons',
            minSelections: 0,
            maxSelections: 2,
            modifiers: [
              {
                modifierId: 'mod_lemon',
                name: 'Extra lemon',
                priceDelta: usd('0.00'),
                available: true,
              },
              {
                modifierId: 'mod_greens',
                name: 'Side greens',
                priceDelta: usd('4.00'),
                available: true,
              },
            ],
          },
        ],
      },
      {
        itemId: 'item_ribeye',
        name: 'Ribeye',
        categoryId: 'cat_mains',
        // Currently 86'd — exercises the unavailable path end to end.
        basePrice: usd('39.00'),
        available: false,
        modifierGroups: [],
      },
    ],
  };
}
