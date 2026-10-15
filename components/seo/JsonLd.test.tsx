import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonLd } from '@/components/seo/JsonLd';

describe('JsonLd', () => {
  it('prints the data as JSON-LD that parses back to the same value', () => {
    const data = { '@type': 'Thing', name: 'Radha & Shyam' };
    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? '')).toEqual(data);
  });

  it('cannot be closed early by a value', () => {
    const { container } = render(<JsonLd data={{ name: '</script><b>x</b>' }} />);
    const script = container.querySelector('script');
    expect(script?.innerHTML).not.toContain('</script>');
    expect(JSON.parse(script?.textContent ?? '')).toEqual({ name: '</script><b>x</b>' });
  });
});
