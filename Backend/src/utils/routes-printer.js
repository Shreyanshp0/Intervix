/**
 * Intervix Express Router Diagnoser
 * Recursively inspects the active Express app layers and logs all registered routes.
 */

const printRegisteredRoutes = (expressApp) => {
  console.log('\n[ROUTES] ====== ACTIVE ROUTE ENDPOINTS CATALOG ======');
  const routes = [];

  const traverse = (stack, prefix = '') => {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        const middlewares = (layer.route.stack || [])
          .map((h) => h.name || 'anonymous')
          .filter((name) => name !== '<anonymous>' && name !== 'bound dispatch')
          .join(', ');
        const middlewareString = middlewares ? ` [Middleware: ${middlewares}]` : '';
        routes.push(`${methods.padEnd(6)} | ${prefix}${layer.route.path}${middlewareString}`);
      } else if (layer.name === 'router' && layer.handle.stack) {
        let newPrefix = prefix;
        if (layer.regexp) {
          const match = layer.regexp.toString().match(/^\/\^\\(\/\w+)/);
          if (match && match[1]) {
            newPrefix = `${prefix}${match[1]}`;
          }
        }
        traverse(layer.handle.stack, newPrefix);
      }
    });
  };

  if (expressApp._router && expressApp._router.stack) {
    traverse(expressApp._router.stack);
  }

  // Deduplicate and print
  [...new Set(routes)].sort().forEach((route) => {
    console.log(`[ROUTES] ${route}`);
  });
  console.log('[ROUTES] =============================================\n');
};

export {
  printRegisteredRoutes
};
