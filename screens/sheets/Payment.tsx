import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import {
  Button,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Payment() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={() => navigation.goBack()}>
        <View />
      </Pressable>
      <BlurView
        experimentalBlurMethod="dimezisBlurView"
        intensity={90}
        tint="light"
        style={{
          height: "50%",
          width: "100%",
          position: "absolute",
          bottom: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowRadius: 8,
          shadowOpacity: 0.15,
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: "#007AFF", fontSize: 17 }}>取消</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, paddingTop: 16 }}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: "bold",
              color: "gray",
            }}
          >
            累计结余
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontSize: 32,
              fontWeight: "900",
              marginTop: 16,
            }}
          >
            ¥123,823.50
          </Text>
          <Text style={{ textAlign: "center" }}>
            存钱是实现财务自由的第一步，想了解更多理财方式，请访问
            <Text style={{ color: "#007AFF" }}> codewithbeto.dev</Text>
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              backgroundColor: "black",
              padding: 10,
              borderRadius: 10,
              marginTop: 16,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 17,
                color: "white",
                textAlign: "center",
              }}
            >
              开通高级版 +
            </Text>
          </TouchableOpacity>

          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: "gray", fontSize: 17, textAlign: "center" }}>
              稍后再说
            </Text>
          </Pressable>

          <Text style={{ textAlign: "center", fontSize: 12, color: "gray" }}>
            查看服务条款与隐私说明
          </Text>
        </View>
      </BlurView>
    </View>
  );
}
