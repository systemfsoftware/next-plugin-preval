// this copied and pasted from is from next.js
// https://github.com/vercel/next.js/blob/235b4cd0a879c947a7b6906c75f1a1b0ba53ce62/packages/next/lib/is-serializable-props.ts
import { SerializableError } from 'next/dist/lib/is-serializable-props.js';

const regexpPlainIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const method = 'preval';

function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function isSerializable(filename: string, input: any): true {
  function visit(visited: Map<any, string>, value: any, path: string) {
    if (visited.has(value)) {
      throw new SerializableError(
        filename,
        method,
        path,
        `Circular references cannot be expressed in JSON (references: \`${
          visited.get(value) || '(self)'
        }\`).`
      );
    }

    visited.set(value, path);
  }

  function isSerializable(
    refs: Map<any, string>,
    value: any,
    path: string
  ): true {
    const type = typeof value;
    if (
      // `null` can be serialized, but not `undefined`.
      value === null ||
      // n.b. `bigint`, `function`, `symbol`, and `undefined` cannot be
      // serialized.
      //
      // `object` is special-cased below, as it may represent `null`, an Array,
      // a plain object, a class, et al.
      type === 'boolean' ||
      type === 'number' ||
      type === 'string'
    ) {
      return true;
    }

    if (type === 'undefined') {
      throw new SerializableError(
        filename,
        method,
        path,
        '`undefined` cannot be serialized as JSON. Please use `null` or omit this value.'
      );
    }

    if (isPlainObject(value)) {
      visit(refs, value, path);

      if (
        Object.entries(value).every(([key, nestedValue]) => {
          const nextPath = regexpPlainIdentifier.test(key)
            ? `${path}.${key}`
            : `${path}[${JSON.stringify(key)}]`;

          const newRefs = new Map(refs);
          return (
            isSerializable(newRefs, key, nextPath) &&
            isSerializable(newRefs, nestedValue, nextPath)
          );
        })
      ) {
        return true;
      }

      throw new SerializableError(
        filename,
        method,
        path,
        `invariant: Unknown error encountered in Object.`
      );
    }

    if (Array.isArray(value)) {
      visit(refs, value, path);

      if (
        value.every((nestedValue, index) => {
          const newRefs = new Map(refs);
          return isSerializable(newRefs, nestedValue, `${path}[${index}]`);
        })
      ) {
        return true;
      }

      throw new SerializableError(
        filename,
        method,
        path,
        `invariant: Unknown error encountered in Array.`
      );
    }

    // None of these can be expressed as JSON:
    // const type: "bigint" | "symbol" | "object" | "function"
    throw new SerializableError(
      filename,
      method,
      path,
      '`' +
        type +
        '`' +
        (type === 'object'
          ? ` ("${Object.prototype.toString.call(value)}")`
          : '') +
        ' cannot be serialized as JSON. Please only return JSON serializable data types.'
    );
  }

  return isSerializable(new Map(), input, '');
}

export default isSerializable;
