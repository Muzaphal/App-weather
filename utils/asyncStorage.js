import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeData = async (key, value) => {
    try {
        const valueToStore =
            typeof value === 'string' ? value : JSON.stringify(value);

        await AsyncStorage.setItem(key, valueToStore);
    } catch (e) {
        console.log('Error storing data:', e);
    }
};

export const getData = async (key) => {
    try {
        const value = await AsyncStorage.getItem(key);

        if (value === null) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (e) {
        console.log('Error retrieving data:', e);
        return null;
    }
};