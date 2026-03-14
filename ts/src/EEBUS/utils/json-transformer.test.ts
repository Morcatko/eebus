import { describe, it, expect } from 'vitest';
import { transformObject, untransformObject } from './json-transformer';

describe('Object Transformation', () => {
    describe('transformObject', () => {
        it('should transform a simple object', () => {
            const input = { a: 1, b: 'test' };
            const expected = [{ a: 1 }, { b: 'test' }];
            expect(transformObject(input)).toEqual(expected);
        });

        it('should handle nested objects', () => {
            const input = { a: 1, b: { c: 2, d: 'nested' } };
            const expected = [{ a: 1 }, { b: [{ c: 2 }, { d: 'nested' }] }];
            expect(transformObject(input)).toEqual(expected);
        });

        it('should handle arrays within objects', () => {
            const input = { a: [1, 2], b: 'test' };
            const expected = [{ a: [1, 2] }, { b: 'test' }];
            expect(transformObject(input)).toEqual(expected);
        });

        it('should handle arrays of objects', () => {
            const input = { a: [{ b: 1 }, { c: 2 }] };
            const expected = [{ a: [[{ b: 1 }], [{ c: 2 }]] }];
            expect(transformObject(input)).toEqual(expected);
        });

        it('should return primitives as is', () => {
            expect(transformObject(123)).toBe(123);
            expect(transformObject('hello')).toBe('hello');
            expect(transformObject(null)).toBe(null);
            expect(transformObject(undefined)).toBe(undefined);
        });

        it('should handle an empty object', () => {
            expect(transformObject({})).toEqual([]);
        });

        it('should handle an empty array', () => {
            expect(transformObject([])).toEqual([]);
        });
    });

    describe('untransformObject', () => {
        it('should untransform a simple object', () => {
            const input = [{ a: 1 }, { b: 'test' }];
            const expected = { a: 1, b: 'test' };
            expect(untransformObject(input)).toEqual(expected);
        });

        it('should handle nested transformed objects', () => {
            const input = [{ a: 1 }, { b: [{ c: 2 }, { d: 'nested' }] }];
            const expected = { a: 1, b: { c: 2, d: 'nested' } };
            expect(untransformObject(input)).toEqual(expected);
        });

        it('should handle arrays within objects', () => {
            const input = [{ a: [1, 2] }, { b: 'test' }];
            const expected = { a: [1, 2], b: 'test' };
            expect(untransformObject(input)).toEqual(expected);
        });

        it('should handle arrays of transformed objects', () => {
            const input = [{ a: [[{ b: 1 }], [{ c: 2 }]] }];
            const expected = { a: [{ b: 1 }, { c: 2 }] };
            expect(untransformObject(input)).toEqual(expected);
        });

        it('should return primitives as is', () => {
            expect(untransformObject(123)).toBe(123);
            expect(untransformObject('hello')).toBe('hello');
            expect(untransformObject(null)).toBe(null);
            expect(untransformObject(undefined)).toBe(undefined);
        });

        it('should handle an empty array (transformed empty object)', () => {
            expect(untransformObject([])).toEqual({});
        });

        it('should handle a simple array of values', () => {
            const input = ['a', 'b', 'c'];
            expect(untransformObject(input)).toEqual(['a', 'b', 'c']);
        });
    });

    describe('Symmetry', () => {
        it('should return the original object after transform and untransform', () => {
            const original = {
                a: 1,
                b: {
                    c: [1, 'two', { d: 3 }],
                    e: 'hello'
                },
                f: null
            };
            const transformed = transformObject(original);
            const untransformed = untransformObject(transformed);
            expect(untransformed).toEqual(original);
        });

        it('should handle complex nested structures', () => {
            const original = {
                level1: {
                    prop1: 'value1',
                    level2: {
                        prop2: [
                            { item: 'a' },
                            { item: 'b', data: [10, 20] }
                        ]
                    }
                }
            };
            const transformed = transformObject(original);
            const untransformed = untransformObject(transformed);
            expect(untransformed).toEqual(original);
        });
    });
});