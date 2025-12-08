export interface PropertyDefinition {
  name: string;
  type: string;
  optional: boolean;
  nested?: PropertyDefinition[];
}

export interface TemplateInterface {
  properties: PropertyDefinition[];
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
}