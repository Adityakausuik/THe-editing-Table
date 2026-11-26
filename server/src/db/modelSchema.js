import { createId, isValidId } from "../utils/ids.js";

export class Schema {
  static Types = {
    ObjectId: "ObjectId",
    Mixed: "Mixed",
    Decimal128: "Decimal128"
  };

  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.options = { timestamps: true, ...options };
    this.paths = {};
    this.methods = {};
    this.statics = {};
    this.indexes = [];

    this._parseDefinition("", definition);
  }

  index(fields, options = {}) {
    this.indexes.push({ fields, options });
    return this;
  }

  pre(event, fn) {
    return this;
  }

  post(event, fn) {
    return this;
  }

  virtual(name) {
    return {
      get: () => this,
      set: () => this
    };
  }

  plugin(fn, opts) {
    if (typeof fn === "function") fn(this, opts);
    return this;
  }

  _parseDefinition(prefix, obj) {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      const isNestedGroup =
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value.type === undefined &&
        !(value instanceof Schema);

      if (isNestedGroup) {
        this.paths[fullPath] = {
          path: fullPath,
          instance: "Mixed",
          options: {},
          defaultValue: undefined
        };
        this._parseDefinition(fullPath, value);
      } else {
        const descriptor = this._normalizeField(value);
        this.paths[fullPath] = {
          path: fullPath,
          ...descriptor
        };
      }
    }
  }

  _normalizeField(val) {
    let type = val;
    let opts = {};

    if (val && typeof val === "object" && !Array.isArray(val) && val.type !== undefined) {
      type = val.type;
      opts = { ...val };
    } else if (Array.isArray(val)) {
      type = Array;
      opts = { type: val };
    }

    let instance = "Mixed";
    if (type === String || type === "String" || type === "string") instance = "String";
    else if (type === Number || type === "Number" || type === "number") instance = "Number";
    else if (type === Boolean || type === "Boolean" || type === "boolean") instance = "Boolean";
    else if (type === Date || type === "Date" || type === "date") instance = "Date";
    else if (type === Array || Array.isArray(type) || Array.isArray(val)) instance = "Array";
    else if (type === Schema.Types.ObjectId || type === "ObjectId") instance = "ObjectId";
    else if (type === Schema.Types.Mixed || type === Object || type === "Mixed") instance = "Mixed";

    return {
      instance,
      options: opts,
      defaultValue: opts.default,
      required: Boolean(opts.required),
      enum: Array.isArray(opts.enum) ? opts.enum : null,
      trim: Boolean(opts.trim),
      lowercase: Boolean(opts.lowercase),
      uppercase: Boolean(opts.uppercase)
    };
  }

  path(name) {
    return this.paths[name] || null;
  }
}

function getNested(obj, path) {
  if (!obj) return undefined;
  return path.split(".").reduce((cur, part) => (cur == null ? undefined : cur[part]), obj);
}

function setNested(obj, path, val) {
  const parts = path.split(".");
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    cur = cur[part] ||= {};
  }
  cur[parts.at(-1)] = val;
}

function createProxy(target, pathPrefix = "", rootDoc = null) {
  const root = rootDoc || target;
  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === "symbol" || (typeof prop === "string" && (prop.startsWith("_") || prop.startsWith("$")))) {
        return obj[prop];
      }
      if (prop in obj && typeof obj[prop] === "function") {
        return obj[prop].bind(rootDoc || target);
      }
      const fullPath = pathPrefix ? `${pathPrefix}.${String(prop)}` : String(prop);
      const raw = root.get ? root.get(fullPath) : getNested(obj, String(prop));
      if (raw !== null && typeof raw === "object" && !(raw instanceof Date)) {
        return createProxy(raw, fullPath, root);
      }
      return raw;
    },
    set(obj, prop, value) {
      if (typeof prop === "string" && (prop.startsWith("_") || prop.startsWith("$"))) {
        obj[prop] = value;
        return true;
      }
      const fullPath = pathPrefix ? `${pathPrefix}.${String(prop)}` : String(prop);
      if (root.set) {
        root.set(fullPath, value);
      } else {
        obj[prop] = value;
      }
      return true;
    }
  });
}

export function model(modelName, schema, collectionNameOverride) {
  const collectionName =
    collectionNameOverride ||
    {
      CareersContent: "careerscontents",
      BrandCollaboration: "brandcollaborations",
      PortfolioItem: "portfolioitems",
      HeroSlide: "heroslides",
      HeroBackgroundVideo: "herobackgroundvideos",
      AboutMe: "aboutmes",
      VideoShowcaseItem: "videoshowcaseitems",
      VideoShowcaseSettings: "videoshowcasesettings",
      WorkingHours: "workinghours",
      ContactSettings: "contactsettings"
    }[modelName] ||
    `${modelName.toLowerCase()}s`;

  class PgDocument {
    constructor(data = {}) {
      this._id = data._id ? String(data._id) : createId();
      this.__v = data.__v !== undefined ? Number(data.__v) : 0;
      this._modifiedPaths = new Set();
      this._data = {};

      // Initialize default containers and values from schema
      for (const [pathStr, desc] of Object.entries(schema.paths)) {
        let val = getNested(data, pathStr);
        if (val === undefined && desc.defaultValue !== undefined) {
          val =
            typeof desc.defaultValue === "function"
              ? desc.defaultValue()
              : typeof desc.defaultValue === "object" && desc.defaultValue !== null
              ? JSON.parse(JSON.stringify(desc.defaultValue))
              : desc.defaultValue;
        }
        if (val !== undefined) {
          this.set(pathStr, val, false);
        }
      }

      // Populate any additional provided data
      for (const [k, v] of Object.entries(data)) {
        if (k !== "_id" && k !== "__v" && !schema.paths[k]) {
          this.set(k, v, false);
        }
      }

      return createProxy(this);
    }

    get(path) {
      if (path === "_id") return this._id;
      if (path === "__v") return this.__v;
      return getNested(this._data, path);
    }

    set(path, value, markModified = true) {
      if (path === "_id") {
        this._id = String(value);
        return;
      }
      if (path === "__v") {
        this.__v = Number(value);
        return;
      }
      if (typeof path === "object" && path !== null) {
        for (const [k, v] of Object.entries(path)) {
          this.set(k, v, markModified);
        }
        return;
      }

      const desc = schema.path(path);
      let val = value;
      if (desc && typeof val === "string") {
        if (desc.trim) val = val.trim();
        if (desc.lowercase) val = val.toLowerCase();
        if (desc.uppercase) val = val.toUpperCase();
      }

      setNested(this._data, path, val);
      if (markModified) {
        this._modifiedPaths.add(path);
      }
    }

    modifiedPaths() {
      return Array.from(this._modifiedPaths);
    }

    $__reset() {
      this._modifiedPaths.clear();
    }

    async validate({ validateModifiedOnly = false } = {}) {
      for (const [pathStr, desc] of Object.entries(schema.paths)) {
        if (validateModifiedOnly && !this._modifiedPaths.has(pathStr)) continue;

        const val = this.get(pathStr);
        if (desc.required && (val === undefined || val === null || val === "")) {
          const err = new Error(`Path \`${pathStr}\` is required.`);
          err.name = "ValidationError";
          err.errors = { [pathStr]: err };
          throw err;
        }

        if (desc.enum && val !== undefined && val !== null && !desc.enum.includes(val)) {
          const err = new Error(`\`${val}\` is not a valid enum value for path \`${pathStr}\`.`);
          err.name = "ValidationError";
          err.errors = { [pathStr]: err };
          throw err;
        }
      }
    }

    toObject() {
      return {
        _id: this._id,
        __v: this.__v,
        ...JSON.parse(JSON.stringify(this._data))
      };
    }

    toJSON() {
      return this.toObject();
    }

    async save() {
      return this;
    }
  }

  for (const pathStr of Object.keys(schema.paths)) {
    const rootProp = pathStr.split(".")[0];
    if (!(rootProp in PgDocument.prototype)) {
      Object.defineProperty(PgDocument.prototype, rootProp, {
        get() {
          return this.get(rootProp);
        },
        set(val) {
          this.set(rootProp, val);
        },
        enumerable: true,
        configurable: true
      });
    }
  }

  // Bind methods from schema
  for (const [methodName, fn] of Object.entries(schema.methods)) {
    PgDocument.prototype[methodName] = fn;
  }

  function ModelFn(data) {
    return new PgDocument(data);
  }

  ModelFn.modelName = modelName;
  ModelFn.schema = schema;
  ModelFn.collection = { collectionName };

  ModelFn.hydrate = function (row) {
    if (!row) return null;
    const doc = new PgDocument(row);
    doc.$__reset();
    return doc;
  };

  // Bind statics from schema
  for (const [staticName, fn] of Object.entries(schema.statics)) {
    ModelFn[staticName] = fn;
  }

  return ModelFn;
}
