// iOS 27 exige el ciclo de vida por escenas (UIScene): sin él la app se cierra al arrancar.
// Expo ya trae EXExpoAppSceneDelegate; este plugin conecta el AppDelegate generado y declara la escena en Info.plist.
const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return c;
  });
  return withAppDelegate(config, (c) => {
    let s = c.modResults.contents;
    if (c.modResults.language !== 'swift') throw new Error('with-ios-scene-lifecycle: solo AppDelegate en Swift');
    if (!s.includes('ExpoReactNativeFactoryProvider')) {
      s = s.replace(/class AppDelegate: ExpoAppDelegate \{/, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
      // la ventana y React Native los crea ahora ExpoAppSceneDelegate
      s = s.replace(/\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\n#endif\n/, '\n');
      if (!s.includes('ExpoReactNativeFactoryProvider') || /startReactNative/.test(s)) throw new Error('with-ios-scene-lifecycle: el AppDelegate generado no tiene la forma esperada');
    }
    c.modResults.contents = s;
    return c;
  });
};
