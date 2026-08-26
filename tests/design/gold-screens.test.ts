import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'design');

describe('gold portfolio design clone', () => {
  it('keeps the original All Screens file unchanged', () => {
    const original = readFileSync(join(root, 'All Screens.dc.html'), 'utf8');
    const clone = readFileSync(join(root, 'All Screens.gold.dc.html'), 'utf8');

    expect(clone).toContain('Finance App.gold.dc.html');
    expect(original).not.toContain('Finance App.gold.dc.html');
  });

  it('presents local-only gold tracking in the cloned profile screen', () => {
    const clone = readFileSync(join(root, 'Finance App.gold.dc.html'), 'utf8');

    expect(clone).toContain('Vàng của tôi');
    expect(clone).toContain('Lịch sử mua vàng');
    expect(clone).toContain('Thêm lần mua');
    expect(clone).toContain('Ngày mua');
    expect(clone).not.toContain('Đăng xuất');
  });
});
