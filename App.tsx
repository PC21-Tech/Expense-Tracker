import * as React from "react";
import { SQLiteProvider } from "expo-sqlite";
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import Home from "./screens/Home";
import Payment from "./screens/sheets/Payment";

const Stack = createNativeStackNavigator();

/** Web: #root has no implicit height; flex:1 alone collapses to a blank page. */
const appRootStyle = (
  Platform.OS === "web"
    ? { flex: 1, minHeight: "100vh", width: "100%" }
    : { flex: 1 }
) as ViewStyle;

// const loadDatabase = async () => {
//   const dbName = "mySQLiteDB.db";
//   const dbAsset = require("./assets/mySQLiteDB.db");
//   const dbUri = Asset.fromModule(dbAsset).uri;
//   const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

//   const fileInfo = await FileSystem.getInfoAsync(dbFilePath);
//   if (!fileInfo.exists) {
//     await FileSystem.makeDirectoryAsync(
//       `${FileSystem.documentDirectory}SQLite`,
//       { intermediates: true }
//     );
//     await FileSystem.downloadAsync(dbUri, dbFilePath);
//   }
// };

export default function App() {
  // const [dbLoaded, setDbLoaded] = React.useState<boolean>(false);

  // React.useEffect(() => {
  //   loadDatabase()
  //     .then(() => setDbLoaded(true))
  //     .catch((e) => console.error(e));
  // }, []);

  // if (!dbLoaded)
  //   return (
  //     <View style={{ flex: 1 }}>
  //       <ActivityIndicator size={"large"} />
  //       <Text>Loading Database...</Text>
  //     </View>
  //   );
  return (
    <View style={appRootStyle}>
      <NavigationContainer>
        <React.Suspense
          fallback={
            <View
              style={[
                appRootStyle,
                { justifyContent: "center", alignItems: "center" },
              ]}
            >
              <ActivityIndicator size={"large"} />
              <Text>正在加载数据库…</Text>
            </View>
          }
        >
          <SQLiteProvider
            databaseName="mySQLiteDB.db"
            useSuspense
            assetSource={{
              assetId: require("./assets/mySQLiteDB.db"),
            }}
          >
            <Stack.Navigator
              screenOptions={{
                contentStyle: { flex: 1 },
              }}
            >
              <Stack.Screen
                name="Home"
                component={Home}
                options={{
                  headerTitle: "记账助手",
                  headerLargeTitle: Platform.OS === "ios",
                  headerTransparent: Platform.OS === "ios" ? true : false,
                  headerBlurEffect: "light",
                }}
              />
              <Stack.Screen
                name="Payment"
                component={Payment}
                options={{
                  presentation: "transparentModal",
                  animation: "slide_from_bottom",
                  animationTypeForReplace: "pop",
                  headerShown: false,
                }}
              />
            </Stack.Navigator>
          </SQLiteProvider>
        </React.Suspense>
      </NavigationContainer>
    </View>
  );
}
