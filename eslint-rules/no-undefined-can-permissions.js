const PERMISSION_FLAG_NAMES = new Set([
  "canAccessFinances",
  "canAccessBackoffice",
  "canAccessCollections",
  "canAccessHistoryWorkshop",
  "canViewSystemHealth",
  "canWriteFleet",
  "canReportIncident",
  "canCreateMaintenanceFromIncident",
  "canAccessRolesHub",
]);

function isDefinitionPosition(node, parent) {
  if (!parent) return false;
  if (parent.type === "VariableDeclarator" && parent.id === node) return true;
  if (
    (parent.type === "FunctionDeclaration" ||
      parent.type === "FunctionExpression" ||
      parent.type === "ArrowFunctionExpression") &&
    parent.params.includes(node)
  ) {
    return true;
  }
  if (
    (parent.type === "PropertyDefinition" || parent.type === "MethodDefinition") &&
    parent.key === node &&
    !parent.computed
  ) {
    return true;
  }
  if (parent.type === "Property" && parent.key === node && !parent.computed) return true;
  if (parent.type === "ImportSpecifier" || parent.type === "ImportDefaultSpecifier") return true;
  return false;
}

function isDefinedInScope(scope, name) {
  let current = scope;
  while (current) {
    if (current.set && current.set.has(name)) return true;
    current = current.upper;
  }
  return false;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Empêche l'utilisation de flags de permission can* non définis (ex: canReportIncident).",
    },
    schema: [],
    messages: {
      undefinedPermission:
        "La variable de permission '{{name}}' est utilisée sans définition locale. Déstructurez-la depuis usePermissions() ou définissez-la explicitement.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Identifier(node) {
        const name = node.name;
        if (!PERMISSION_FLAG_NAMES.has(name)) return;
        if (isDefinitionPosition(node, node.parent)) return;

        const scope = sourceCode.getScope(node);
        if (isDefinedInScope(scope, name)) return;

        context.report({
          node,
          messageId: "undefinedPermission",
          data: { name },
        });
      },
    };
  },
};
