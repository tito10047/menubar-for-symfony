import GLib from 'gi://GLib';
import { FieldSignature, WireSpec } from './wire.js';

/**
 * A D-Bus `a{sv}` payload as GJS represents it in both directions: a plain
 * object whose values are still boxed variants.
 */
export type VariantDict = Record<string, GLib.Variant>;

type FieldValue = string | number | boolean;

/**
 * Converts a wire shape into an `a{sv}` payload, driven by its spec so that
 * every declared field is always present on the bus.
 */
export function packDict<T extends object>(spec: WireSpec<T>, value: T): VariantDict {
    const dict: VariantDict = {};
    for (const key of fieldsOf(spec)) {
        // The spec is verified against the wire shape by `satisfies WireSpec<T>`
        // at its declaration site, which is what makes this cast safe.
        dict[key] = new GLib.Variant(spec[key], value[key] as never);
    }
    return dict;
}

export function packDicts<T extends object>(spec: WireSpec<T>, values: readonly T[]): VariantDict[] {
    return values.map(value => packDict(spec, value));
}

/**
 * Reads an `a{sv}` payload back into its wire shape.
 *
 * Every field is mandatory and type-checked: a payload that does not match the
 * spec throws with the offending field named, rather than silently yielding an
 * object with `undefined` holes that would surface much later as a UI glitch.
 *
 * @param context Human-readable origin of the payload, used in error messages.
 */
export function unpackDict<T extends object>(spec: WireSpec<T>, payload: unknown, context: string): T {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new TypeError(`${context}: expected a D-Bus dictionary, got ${describe(payload)}`);
    }

    const source = payload as Record<string, unknown>;
    const result: Record<string, FieldValue> = {};
    for (const key of fieldsOf(spec)) {
        result[key] = readField(source[key], spec[key], `${context}.${key}`);
    }
    return result as T;
}

export function unpackDicts<T extends object>(spec: WireSpec<T>, payload: unknown, context: string): T[] {
    if (!Array.isArray(payload)) {
        throw new TypeError(`${context}: expected an array of D-Bus dictionaries, got ${describe(payload)}`);
    }
    return payload.map((entry, index) => unpackDict(spec, entry, `${context}[${index}]`));
}

function fieldsOf<T extends object>(spec: WireSpec<T>): Array<keyof T & string> {
    return Object.keys(spec) as Array<keyof T & string>;
}

function readField(raw: unknown, signature: FieldSignature, context: string): FieldValue {
    if (!(raw instanceof GLib.Variant)) {
        throw new TypeError(`${context}: expected a GLib.Variant, got ${describe(raw)}`);
    }

    const actual = raw.get_type_string();
    if (actual !== signature) {
        throw new TypeError(`${context}: expected signature '${signature}', got '${actual}'`);
    }

    return raw.deep_unpack() as FieldValue;
}

function describe(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (Array.isArray(value)) return `array of length ${value.length}`;
    return typeof value;
}
