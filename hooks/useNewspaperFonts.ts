import { useFonts } from 'expo-font';

/**
 * Loads all newspaper heading fonts. Returns true once all fonts are ready.
 * LibreBaskerville is also loaded by FontText/FontTextInput, but including it
 * here keeps this hook self-contained.
 */
export const useNewspaperFonts = (): boolean => {
    const [fontsLoaded] = useFonts({
        LibreBaskerville: require('../assets/fonts/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf'),
        PlayfairDisplay: require('../assets/fonts/newspaper/PlayfairDisplay.ttf'),
        EBGaramond: require('../assets/fonts/newspaper/EBGaramond.ttf'),
        CrimsonText: require('../assets/fonts/newspaper/CrimsonText.ttf'),
        IMFellEnglish: require('../assets/fonts/newspaper/IMFellEnglish.ttf'),
    });
    return fontsLoaded;
};
