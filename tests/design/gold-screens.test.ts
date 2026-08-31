import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'design');

describe('gold portfolio design clone', () => {
  it('keeps the original All Screens file unchanged', () => {
    const original = readFileSync(join(root, 'All Screens.dc.html'), 'utf8');

    expect(original).not.toContain('Finance App.gold.dc.html');
  });

  it('presents local-only gold tracking in the cloned profile screen', () => {
    const clone = readFileSync(join(root, 'Finance App.gold-management.dc.html'), 'utf8');

    expect(clone).toContain('Vàng của tôi');
    expect(clone).toContain('Lịch sử giao dịch');
    expect(clone).toContain('Thêm giao dịch');
    expect(clone).toContain('Quản lý vàng');
  });
});
