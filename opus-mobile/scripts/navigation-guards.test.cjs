const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const appRoot = path.resolve(__dirname, "..");
const routerRoot = path.join(appRoot, "node_modules/expo-router/build");
const { StackRouter, StackActions } = require(path.join(
  routerRoot, "react-navigation/routers/StackRouter.js",
));

// Execute real components and Expo's installed guard filter. Only native/context
// dependencies are stubbed: no source-string assertions or duplicated guard logic.
function loadModule(file, dependencies, transpile = false) {
  const source = fs.readFileSync(file, "utf8");
  const code = transpile ? ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText : source;
  const module = { exports: {} };
  const customRequire = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unstubbed dependency ${name} from ${file}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
    filename: file,
  })(customRequire, module, module.exports);
  return module.exports;
}

function allowedRoutes(session) {
  const Group = () => null;
  const screenModule = loadModule(path.join(routerRoot, "views/Screen.js"), {
    react: React,
    "../react-navigation/native": {},
    "../useNavigation": {},
    "./useSafeLayoutEffect": {},
    "../utils/stack": {},
  });
  const protectedModule = loadModule(path.join(routerRoot, "views/Protected.js"), {
    react: React,
    "../primitives": { Group },
  });
  const { useFilterScreenChildren } = loadModule(path.join(
    routerRoot, "layouts/withLayoutContext.js",
  ), {
    react: React,
    "react/jsx-runtime": require("react/jsx-runtime"),
    "../Route": {},
    "../native-tabs/NativeTabTrigger": { isNativeTabTrigger: () => false },
    "../useScreens": {},
    "./IsWithinLayoutContext": {},
    "../views/Protected": protectedModule,
    "../views/Screen": screenModule,
  });
  let filtered;
  function Stack({ children }) {
    filtered = useFilterScreenChildren(children, { contextKey: "/" });
    return null;
  }
  Stack.Screen = screenModule.Screen;
  Stack.Protected = protectedModule.Protected;
  const Empty = () => null;
  const { AppNavigation } = loadModule(path.join(
    appRoot, "src/components/navigation/app-navigation.tsx",
  ), {
    react: React,
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react-native": { Platform: { OS: "ios" } },
    "expo-router": {
      Stack,
      DefaultTheme: { colors: {} },
      ThemeProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    },
    "expo-status-bar": { StatusBar: Empty },
    "@/providers/studio-provider": {
      useStudio: () => ({
        colors: {}, t: (en) => en, mediumFont: "test", ready: true,
        setTheme: () => {},
      }),
    },
    "@/providers/session-provider": {
      useSession: () => ({ loading: false, error: null, retry: () => {}, ...session }),
    },
    "@/components/dashboard/connection-notice": { ConnectionNotice: Empty },
    "@/components/account/recovery-screen": { RecoveryScreen: Empty },
    "@/components/account/startup-screen": { StartupScreen: Empty },
    "@/hooks/use-reduced-motion": { useReducedMotion: () => true },
    "./back-button": { BackButton: Empty },
  }, true);
  renderToStaticMarkup(React.createElement(AppNavigation));
  assert(filtered, "Ready navigation must render a stack");
  return filtered.screens.map((screen) => screen.name);
}

const signedOut = { authenticated: false, studio: null };
const noStudio = { authenticated: true, studio: null };
const withStudio = (bookingAccess = "team") => ({
  authenticated: true, studio: { profile: { theme: "clarity", bookingAccess } },
});
const options = (routeNames) => ({
  routeNames,
  routeParamList: {},
  routeGetIdList: {},
  routeKeyChanges: [],
});

test("successful sign-in opens the studio rather than account deletion", () => {
  const router = StackRouter({});
  const initial = router.getInitialState(options(allowedRoutes(signedOut)));
  assert.equal(initial.routes[initial.index].name, "sign-in");
  const signedIn = router.getStateForRouteNamesChange(initial, options(allowedRoutes(withStudio())));
  assert.equal(signedIn.routes[signedIn.index].name, "(tabs)");
  assert(signedIn.routeNames.includes("account/delete"));
  const deletion = router.getStateForAction(signedIn, StackActions.push("account/delete"), options(signedIn.routeNames));
  assert.equal(deletion.routes[deletion.index].name, "account/delete");
});

test("an account without a studio opens access guidance and can still request deletion", () => {
  const router = StackRouter({});
  const initial = router.getInitialState(options(allowedRoutes(signedOut)));
  const signedIn = router.getStateForRouteNamesChange(initial, options(allowedRoutes(noStudio)));
  assert.equal(signedIn.routes[signedIn.index].name, "no-studio");
  assert(!signedIn.routeNames.includes("(tabs)"));
  const deletion = router.getStateForAction(signedIn, StackActions.push("account/delete"), options(signedIn.routeNames));
  assert.equal(deletion.routes[deletion.index].name, "account/delete");
  const signedOutAgain = router.getStateForRouteNamesChange(deletion, options(allowedRoutes(signedOut)));
  assert.equal(signedOutAgain.routes[signedOutAgain.index].name, "sign-in");
  assert(!signedOutAgain.routeNames.includes("account/delete"));
});

test("personal staff routing keeps appointment access and excludes team/client management", () => {
  const routeNames = allowedRoutes(withStudio("own"));
  const router = StackRouter({});
  const state = router.getInitialState(options(routeNames));
  assert.equal(state.routes[state.index].name, "(tabs)");
  for (const name of ["appointment/new", "appointment/[id]", "notifications/preferences", "account/delete"])
    assert(routeNames.includes(name), `${name} must stay accessible`);
  for (const name of ["client/[id]", "service/[id]", "team/[id]"])
    assert.equal(router.getStateForAction(state, StackActions.push(name), options(routeNames)), null);
});

test("loss of studio membership removes private route history without hiding deletion", () => {
  const router = StackRouter({});
  const initial = router.getInitialState(options(allowedRoutes(withStudio())));
  const appointment = router.getStateForAction(initial, StackActions.push("appointment/[id]", { id: "fictional-booking" }), options(initial.routeNames));
  const revoked = router.getStateForRouteNamesChange(appointment, options(allowedRoutes(noStudio)));
  assert.deepEqual(revoked.routes.map((route) => route.name), ["no-studio"]);
  assert(revoked.routeNames.includes("account/delete"));
});
