import React from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Carousel from 'react-native-reanimated-carousel';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Clipboard from 'expo-clipboard';
import Animated, { useSharedValue, useAnimatedStyle, interpolate } from 'react-native-reanimated';
const { width: screenWidth } = Dimensions.get('window');
import Toast from 'react-native-toast-message';

const steps = [
  {
    title: "Se connecter sur pm.eliottb.dev",
    description: "Accédez au site web pm.eliottb.dev sur n'importe quelle plateforme connectée à une enceinte et entrez le code du salon.",
    icon: "globe-outline",
    link: "https://pm.eliottb.dev"
  },
  {
    title: "Partager le code du salon",
    description: "Une fois que vous êtes dans le salon, partagez le code du salon avec les autres membres pour qu'ils puissent vous rejoindre.",
    icon: "share-outline"
  },
  {
    title: "Ajouter des musiques",
    description: "Ajoutez des musiques sur l'application. Tous les membres du salon peuvent ajouter des morceaux à la playlist.",
    icon: "musical-notes-outline"
  },
  {
    title: "Voter pour passer",
    description: "Si une musique ne vous plaît pas, swipez de gauche à droite pour voter pour passer. Si la majorité vote, la prochaine chanson sera jouée.",
    icon: "thumbs-down-outline"
  }
];

const HowToScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    'Krub-Medium': require('../assets/fonts/Krub-Medium.ttf'),
    'Krub-Bold': require('../assets/fonts/Krub-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync("https://pm.eliottb.dev");
    Toast.show({
      text1: 'Lien copié dans le presse-papiers !',
      type: 'success',
    });
  };

  const progressValue = useSharedValue(0);

  const [currentIndex, setCurrentIndex] = React.useState(0);

  const renderItem = ({ item, index }) => (
    <LinearGradient
      colors={['#2d004d', '#4c0080']}
      style={[styles.slide, styles.shadowProp]}
    >
      <View style={styles.slideContent}>
        <Ionicons name={item.icon} size={80} color="#F0A56C" />
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
        {item.link && (
          <TouchableOpacity onPress={copyToClipboard}>
            <Text style={styles.linkText}>{item.link}</Text>
          </TouchableOpacity>
        )}
        {index === steps.length - 1 && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate("File d'attente")}
          >
            <Text style={styles.startButtonText}>Commencer</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );

  return (
    <LinearGradient colors={['#4c0080', '#2d004d']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comment ça marche</Text>
      </View>
      <Carousel
        loop
        width={screenWidth}
        height={screenWidth * 1.5}
        data={steps}
        renderItem={renderItem}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 50,
        }}
        onProgressChange={(_, absoluteProgress) => {
          progressValue.value = absoluteProgress;
        }}
        onSnapToItem={(index) => setCurrentIndex(index)}
      />
      <View style={styles.paginationContainer}>
        {steps.map((_, index) => {
          return <PaginationItem key={index} index={index} length={steps.length} progressValue={progressValue} />;
        })}
      </View>
    </LinearGradient>
  );
};

const PaginationItem = ({ index, length, progressValue }) => {
  const animatedStyle = useAnimatedStyle(() => {
    let inputRange = [index - 1, index, index + 1];
    let outputRange = [10, 20, 10];

    if (index === 0) {
      inputRange = [length - 1, 0, 1];
    } else if (index === length - 1) {
      inputRange = [length - 2, length - 1, 0];
    }

    return {
      width: interpolate(
        progressValue.value,
        inputRange,
        outputRange,
        'clamp'
      ),
      opacity: interpolate(
        progressValue.value,
        inputRange,
        [0.5, 1, 0.5],
        'clamp'
      ),
    };
  });

  return <Animated.View style={[styles.paginationDot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: '15%',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Krub-Bold',
    textAlign: 'center',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 45,
    margin: 10,
  },
  slideContent: {
    alignItems: 'center',
    padding: 20,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F0A56C',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Krub-Bold',
  },
  slideDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Krub-Medium',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: -100,
    color: '#F0A56C',
    fontSize: 16,
    fontFamily: 'Krub-Medium',
  },
  linkText: {
    color: '#F0A56C',
    textDecorationLine: 'underline',
    marginTop: 10,
    fontSize: 25,
    fontFamily: 'Krub-Bold',
  },
  shadowProp: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 150,
  },
  paginationDot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0A56C',
    marginHorizontal: 5,
  },
  startButton: {
    backgroundColor: '#F0A56C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  startButtonText: {
    color: '#2d004d',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Krub-Bold',
  },
});

export default HowToScreen;
