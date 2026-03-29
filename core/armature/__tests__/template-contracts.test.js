'use strict';

const { describe, it, expect } = require('bun:test');
const {
  validateTemplateFrontmatter,
  TEMPLATE_SLOT_TYPES,
  TEMPLATE_CONTRACT_SHAPE,
} = require('../template-contracts.cjs');

describe('TEMPLATE_SLOT_TYPES', () => {
  it('contains exactly 4 valid types', () => {
    expect(TEMPLATE_SLOT_TYPES).toHaveLength(4);
  });

  it('includes string, array, number, boolean', () => {
    expect(TEMPLATE_SLOT_TYPES).toContain('string');
    expect(TEMPLATE_SLOT_TYPES).toContain('array');
    expect(TEMPLATE_SLOT_TYPES).toContain('number');
    expect(TEMPLATE_SLOT_TYPES).toContain('boolean');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(TEMPLATE_SLOT_TYPES)).toBe(true);
  });
});

describe('TEMPLATE_CONTRACT_SHAPE', () => {
  it('has required and optional arrays', () => {
    expect(Array.isArray(TEMPLATE_CONTRACT_SHAPE.required)).toBe(true);
    expect(Array.isArray(TEMPLATE_CONTRACT_SHAPE.optional)).toBe(true);
  });

  it('requires name, version, slots', () => {
    expect(TEMPLATE_CONTRACT_SHAPE.required).toContain('name');
    expect(TEMPLATE_CONTRACT_SHAPE.required).toContain('version');
    expect(TEMPLATE_CONTRACT_SHAPE.required).toContain('slots');
  });

  it('has description, tags, token_estimate, includes as optional', () => {
    expect(TEMPLATE_CONTRACT_SHAPE.optional).toContain('description');
    expect(TEMPLATE_CONTRACT_SHAPE.optional).toContain('tags');
    expect(TEMPLATE_CONTRACT_SHAPE.optional).toContain('token_estimate');
    expect(TEMPLATE_CONTRACT_SHAPE.optional).toContain('includes');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(TEMPLATE_CONTRACT_SHAPE)).toBe(true);
  });
});

describe('validateTemplateFrontmatter', () => {
  it('returns valid for complete frontmatter', () => {
    const result = validateTemplateFrontmatter({
      name: 'face-prompt',
      version: '1.0',
      slots: {},
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for frontmatter with populated slots', () => {
    const result = validateTemplateFrontmatter({
      name: 'test-template',
      version: '2.0',
      slots: {
        user_name: { required: true, type: 'string' },
        items: { required: false, type: 'array' },
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid for empty object', () => {
    const result = validateTemplateFrontmatter({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
    expect(result.errors.some(e => e.includes('slots'))).toBe(true);
  });

  it('returns invalid for null', () => {
    const result = validateTemplateFrontmatter(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('frontmatter: must be a non-null object');
  });

  it('returns invalid for array', () => {
    const result = validateTemplateFrontmatter([]);
    expect(result.valid).toBe(false);
  });

  it('catches missing name', () => {
    const result = validateTemplateFrontmatter({ version: '1.0', slots: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('catches empty name', () => {
    const result = validateTemplateFrontmatter({ name: '', version: '1.0', slots: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('catches missing version', () => {
    const result = validateTemplateFrontmatter({ name: 'x', slots: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  it('catches missing slots', () => {
    const result = validateTemplateFrontmatter({ name: 'x', version: '1.0' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slots'))).toBe(true);
  });

  it('catches slots as array', () => {
    const result = validateTemplateFrontmatter({ name: 'x', version: '1.0', slots: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slots'))).toBe(true);
  });

  it('catches slot missing required boolean', () => {
    const result = validateTemplateFrontmatter({
      name: 'x',
      version: '1.0',
      slots: { foo: {} },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slots.foo.required'))).toBe(true);
  });

  it('catches slot with invalid type', () => {
    const result = validateTemplateFrontmatter({
      name: 'x',
      version: '1.0',
      slots: { bar: { required: true, type: 'object' } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slots.bar.type'))).toBe(true);
    expect(result.errors.some(e => e.includes('object'))).toBe(true);
  });

  it('allows slot without type field', () => {
    const result = validateTemplateFrontmatter({
      name: 'x',
      version: '1.0',
      slots: { baz: { required: true } },
    });
    expect(result.valid).toBe(true);
  });

  it('catches null slot definition', () => {
    const result = validateTemplateFrontmatter({
      name: 'x',
      version: '1.0',
      slots: { broken: null },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slots.broken'))).toBe(true);
  });

  it('catches array slot definition', () => {
    const result = validateTemplateFrontmatter({
      name: 'x',
      version: '1.0',
      slots: { broken: [1, 2] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('slots.broken'))).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const result = validateTemplateFrontmatter({
      slots: { a: { type: 'invalid' } },
    });
    expect(result.valid).toBe(false);
    // Missing name + missing version + slot required missing + slot type invalid
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
