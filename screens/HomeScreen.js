import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import {
  View,
  TextInput,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  CalendarDaysIcon,
  MagnifyingGlassIcon,
} from 'react-native-heroicons/outline';

import { MapPinIcon } from 'react-native-heroicons/solid';

import { theme } from '../theme';
import { debounce } from 'lodash';

import {
  fetchLocations,
  fetchWeatherForecast,
} from '../api/weather';

import { weatherImages } from '../constants';

import { format } from 'date-fns';

import {
  getData,
  storeData,
} from '../utils/asyncStorage';


// ============================================================
// WEATHER ICON HELPER
// ============================================================

const getWeatherIcon = (condition) => {
  if (!condition) {
    return weatherImages.other;
  }

  // Exact match
  if (weatherImages[condition]) {
    return weatherImages[condition];
  }

  // Case-insensitive match
  const conditionLower = condition.toLowerCase();

  for (const key in weatherImages) {
    if (key.toLowerCase() === conditionLower) {
      return weatherImages[key];
    }
  }

  // Sunny / Clear
  if (
    conditionLower.includes('sunny') ||
    conditionLower.includes('clear')
  ) {
    return weatherImages['Sunny'];
  }

  // Clouds
  if (
    conditionLower.includes('cloud') ||
    conditionLower.includes('overcast')
  ) {
    return weatherImages['Cloudy'];
  }

  // Rain / Drizzle
  if (
    conditionLower.includes('rain') ||
    conditionLower.includes('drizzle') ||
    conditionLower.includes('shower')
  ) {
    if (
      conditionLower.includes('heavy') ||
      conditionLower.includes('torrential')
    ) {
      return weatherImages['Heavy rain'];
    }

    if (
      conditionLower.includes('patchy') ||
      conditionLower.includes('light')
    ) {
      return weatherImages['Light rain'];
    }

    return weatherImages['Moderate rain'];
  }

  // Thunderstorm
  if (
    conditionLower.includes('thunder') ||
    conditionLower.includes('storm')
  ) {
    return (
      weatherImages['Thunderstorm'] ||
      weatherImages.other
    );
  }

  // Snow / Blizzard / Sleet
  if (
    conditionLower.includes('snow') ||
    conditionLower.includes('blizzard') ||
    conditionLower.includes('sleet')
  ) {
    return (
      weatherImages['Snow'] ||
      weatherImages.other
    );
  }

  // Fog / Mist
  if (
    conditionLower.includes('fog') ||
    conditionLower.includes('mist')
  ) {
    return (
      weatherImages['Fog'] ||
      weatherImages.other
    );
  }

  // Haze / Smoke
  if (
    conditionLower.includes('haze') ||
    conditionLower.includes('smoke')
  ) {
    return (
      weatherImages['Haze'] ||
      weatherImages.other
    );
  }

  // Dust / Sand
  if (
    conditionLower.includes('dust') ||
    conditionLower.includes('sand')
  ) {
    return (
      weatherImages['Dust'] ||
      weatherImages.other
    );
  }

  return weatherImages.other;
};


// ============================================================
// FORMAT FORECAST DATE
// ============================================================

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);

    return format(date, 'EEEE');
  } catch (error) {
    return 'Unknown';
  }
};


// ============================================================
// FORMAT CURRENT LOCAL TIME
// ============================================================

const formatLocalTime = (localTime) => {
  if (!localTime) {
    return '--:--';
  }

  try {
    /*
      WeatherAPI normally returns:

      2026-09-05 14:21

      Convert it to:

      2:21 PM
    */

    const date = new Date(
      localTime.replace(' ', 'T')
    );

    return format(date, 'h:mm a');
  } catch (error) {
    console.log('Time formatting error:', error);

    return '--:--';
  }
};


// ============================================================
// HOME SCREEN
// ============================================================

export default function HomeScreen() {

  const [showSearch, setShowSearch] = useState(false);

  const [locations, setLocations] = useState([]);

  const [weather, setWeather] = useState({});

  const [loading, setLoading] = useState(false);

  // Used to refresh the displayed time every minute
  const [timeRefresh, setTimeRefresh] = useState(
    Date.now()
  );


  // ============================================================
  // REFRESH TIME EVERY MINUTE
  // ============================================================

  useEffect(() => {

    const interval = setInterval(() => {

      setTimeRefresh(Date.now());

    }, 60000);

    return () => clearInterval(interval);

  }, []);


  // ============================================================
  // LOAD SAVED CITY / DEFAULT KAMPALA
  // ============================================================

  useEffect(() => {

    const loadWeather = async () => {

      try {

        const savedCity = await getData('city');

        /*
          If a city was previously selected:

          id:2014953

          will be used.

          Otherwise:

          q:Kampala
        */

        const query =
          savedCity || 'q:Kampala';

        console.log(
          'Loading weather for:',
          query
        );

        setLoading(true);

        const data =
          await fetchWeatherForecast({
            query,
            days: 7,
          });

        console.log(
          'Initial forecast:',
          data
        );

        if (data) {

          setWeather(data);

        }

      } catch (error) {

        console.error(
          'Error loading weather:',
          error
        );

      } finally {

        setLoading(false);

      }

    };

    loadWeather();

  }, []);


  // ============================================================
  // HANDLE CITY SELECTION
  // ============================================================

  const handleLocation = async (loc) => {

    console.log(
      'location:',
      loc
    );

    setLocations([]);

    setShowSearch(false);

    setLoading(true);

    try {

      /*
        Use WeatherAPI location ID.

        Example:

        id:2014953
      */

      const query =
        `id:${loc.id}`;


      // Save selected city
      await storeData(
        'city',
        query
      );


      // Fetch weather
      const data =
        await fetchWeatherForecast({
          query,
          days: 7,
        });


      console.log(
        'got forecast:',
        data
      );


      if (data) {

        setWeather(data);

      }

    } catch (error) {

      console.error(
        'Error fetching weather:',
        error
      );

    } finally {

      setLoading(false);

    }

  };


  // ============================================================
  // SEARCH CITY
  // ============================================================

  const handleSearch = (value) => {

    if (value.length > 2) {

      fetchLocations({
        cityName: value,
      })

        .then((data) => {

          console.log(
            'got locations:',
            data
          );

          if (data) {

            setLocations(data);

          } else {

            setLocations([]);

          }

        })

        .catch((error) => {

          console.error(
            'Error fetching locations:',
            error
          );

          setLocations([]);

        });

    } else {

      setLocations([]);

    }

  };


  // ============================================================
  // DEBOUNCED SEARCH
  // ============================================================

  const handleTextDebouce = useMemo(

    () =>
      debounce(
        handleSearch,
        700
      ),

    []

  );


  // Cleanup debounce
  useEffect(() => {

    return () => {

      handleTextDebouce.cancel();

    };

  }, [handleTextDebouce]);


  // ============================================================
  // WEATHER DATA
  // ============================================================

  const {
    current,
    location,
    forecast,
  } = weather;


  // Today's forecast
  const todaysForecast =
    forecast?.forecastday?.[0] || null;


  // Next days
  const weeklyForecast =
    forecast?.forecastday?.slice(1) || [];


  // ============================================================
  // CURRENT LOCAL TIME
  // ============================================================

  const currentLocalTime =
    location?.localtime
      ? formatLocalTime(location.localtime)
      : '--:--';


  // Prevent unused warning
  void timeRefresh;
  void todaysForecast;


  // ============================================================
  // UI
  // ============================================================

  return (

    <View
      style={{
        flex: 1,
      }}
    >

      <StatusBar style="light" />


      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <Image
        source={require('../assets/images/bg.png')}
        blurRadius={70}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />


      <SafeAreaView
        style={{
          flex: 1,
        }}
      >


        {/* ==================================================
            SEARCH SECTION
        ================================================== */}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 50,
            height: 48,
            zIndex: 10,
          }}
        >

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent:
                showSearch
                  ? 'space-between'
                  : 'flex-end',

              height: 48,

              backgroundColor:
                showSearch
                  ? 'rgba(255,255,255,0.20)'
                  : 'transparent',

              borderRadius: 30,

              borderWidth:
                showSearch ? 1 : 0,

              borderColor:
                'rgba(255,255,255,0.25)',

              paddingLeft:
                showSearch ? 18 : 0,

              paddingRight: 2,
            }}
          >

            {showSearch && (

              <TextInput
                onChangeText={
                  handleTextDebouce
                }

                placeholder="Search city"

                placeholderTextColor={
                  'rgba(255,255,255,0.7)'
                }

                autoFocus

                style={{
                  flex: 1,
                  color: 'white',
                  fontSize: 16,
                }}
              />

            )}


            <TouchableOpacity
              activeOpacity={0.7}

              onPress={() =>
                setShowSearch(
                  !showSearch
                )
              }

              style={{
                width: 44,
                height: 44,
                borderRadius: 22,

                backgroundColor:
                  'rgba(255,255,255,0.28)',

                alignItems: 'center',
                justifyContent: 'center',

                marginLeft:
                  showSearch ? 8 : 0,
              }}
            >

              <MagnifyingGlassIcon
                size={24}
                color="white"
              />

            </TouchableOpacity>

          </View>


          {/* =================================================
              SEARCH RESULTS
          ================================================= */}

          {locations.length > 0 &&
            showSearch ? (

            <View
              style={{
                position: 'absolute',

                top: 58,

                left: 0,
                right: 0,

                backgroundColor:
                  '#D1D5DB',

                borderRadius: 18,

                overflow: 'hidden',

                borderWidth: 1,

                borderColor:
                  'rgba(255,255,255,0.35)',

                elevation: 8,

                shadowColor: '#000',

                shadowOffset: {
                  width: 0,
                  height: 4,
                },

                shadowOpacity: 0.2,

                shadowRadius: 8,
              }}
            >

              {locations.map(
                (loc, index) => {

                  const isLast =
                    index ===
                    locations.length - 1;


                  return (

                    <TouchableOpacity
                      key={`${loc.id}-${index}`}

                      onPress={() =>
                        handleLocation(loc)
                      }

                      activeOpacity={0.7}

                      style={{
                        flexDirection: 'row',

                        alignItems: 'center',

                        paddingHorizontal: 16,

                        paddingVertical: 14,

                        borderBottomWidth:
                          isLast ? 0 : 1,

                        borderBottomColor:
                          '#9CA3AF',

                        backgroundColor:
                          '#D1D5DB',
                      }}
                    >

                      <MapPinIcon
                        size={20}
                        color="#6B7280"
                      />

                      <Text
                        style={{
                          color: '#111827',
                          fontSize: 16,
                          marginLeft: 10,
                        }}
                      >

                        {loc.name},{' '}
                        {loc.country}

                      </Text>

                    </TouchableOpacity>

                  );

                }
              )}

            </View>

          ) : null}

        </View>


        {/* ==================================================
            MAIN FORECAST SECTION
        ================================================== */}

        <View
          style={{
            marginHorizontal: 16,

            flex: 1,

            justifyContent: 'center',

            marginBottom: 8,
          }}
        >


          {/* =================================================
              LOCATION
          ================================================= */}

          <Text
            style={{
              color: 'white',

              textAlign: 'center',

              fontSize: 24,

              fontWeight: '700',
            }}
          >

            {location?.name || 'Kampala'},

            <Text
              style={{
                color: '#D1D5DB',

                fontSize: 18,

                fontWeight: '600',
              }}
            >

              {' '}

              {location?.country ||
                'Uganda'}

            </Text>

          </Text>


          {/* =================================================
              WEATHER IMAGE
          ================================================= */}

          <View
            style={{
              flexDirection: 'row',

              justifyContent: 'center',
            }}
          >

            <Image
              source={getWeatherIcon(
                current?.condition?.text
              )}

              style={{
                width: 208,

                height: 208,

                marginTop: 20,

                marginBottom: 40,
              }}

              resizeMode="contain"
            />

          </View>


          {/* =================================================
              TEMPERATURE
          ================================================= */}

          <View
            style={{
              marginBottom: 80,
            }}
          >

            <Text
              style={{
                color: 'white',

                textAlign: 'center',

                fontSize: 60,

                fontWeight: 'bold',

                marginLeft: 20,
              }}
            >

              {current?.temp_c ??
                '--'}&#176;

            </Text>


            <Text
              style={{
                color: 'white',

                textAlign: 'center',

                fontSize: 20,

                letterSpacing: 1,
              }}
            >

              {current?.condition?.text ||
                'Loading...'}

            </Text>

          </View>


          {/* =================================================
              WEATHER STATS
          ================================================= */}

          <View
            style={{
              flexDirection: 'row',

              justifyContent:
                'space-between',

              marginHorizontal: 16,
            }}
          >


            {/* ==============================================
                WIND
            ============================================== */}

            <View
              style={{
                flexDirection: 'row',

                alignItems: 'center',
              }}
            >

              <Image
                source={require(
                  '../assets/icons/wind.png'
                )}

                style={{
                  width: 24,

                  height: 24,

                  marginHorizontal: 8,
                }}
              />

              <Text
                style={{
                  color: 'white',

                  fontWeight: '600',

                  fontSize: 16,
                }}
              >

                {current?.wind_kph ??
                  0}{' '}

                km/h

              </Text>

            </View>


            {/* ==============================================
                HUMIDITY
            ============================================== */}

            <View
              style={{
                flexDirection: 'row',

                alignItems: 'center',
              }}
            >

              <Image
                source={require(
                  '../assets/icons/drop.png'
                )}

                style={{
                  width: 24,

                  height: 24,

                  marginHorizontal: 8,
                }}
              />

              <Text
                style={{
                  color: 'white',

                  fontWeight: '600',

                  fontSize: 16,
                }}
              >

                {current?.humidity ??
                  0}%

              </Text>

            </View>


            {/* ==============================================
                CURRENT LOCAL TIME
            ============================================== */}

            <View
              style={{
                flexDirection: 'row',

                alignItems: 'center',
              }}
            >

              <Image
                source={require(
                  '../assets/icons/sun.png'
                )}

                style={{
                  width: 24,

                  height: 24,

                  marginHorizontal: 8,
                }}
              />

              <Text
                style={{
                  color: 'white',

                  fontWeight: '600',

                  fontSize: 16,
                }}
              >

                {currentLocalTime}

              </Text>

            </View>

          </View>

        </View>


        {/* ==================================================
            7-DAY FORECAST
        ================================================== */}

        <View
          style={{
            marginBottom: 8,

            marginTop: -20,
          }}
        >

          <View
            style={{
              flexDirection: 'row',

              alignItems: 'center',

              marginHorizontal: 20,

              marginBottom: 20,
            }}
          >

            <CalendarDaysIcon
              size={22}
              color="white"
            />

            <Text
              style={{
                color: 'white',

                fontSize: 16,

                marginLeft: 8,
              }}
            >

              Daily Forecast

            </Text>

          </View>


          <ScrollView
            horizontal

            contentContainerStyle={{
              paddingHorizontal: 15,
            }}

            showsHorizontalScrollIndicator={
              false
            }
          >

            {weeklyForecast.length > 0 ? (

              weeklyForecast.map(
                (day, index) => (

                  <View
                    key={`${day.date}-${index}`}

                    style={{
                      flexDirection:
                        'column',

                      justifyContent:
                        'center',

                      alignItems:
                        'center',

                      width: 96,

                      borderRadius: 24,

                      paddingVertical: 12,

                      marginRight: 16,

                      backgroundColor:
                        theme.bgWhite(0.15),
                    }}
                  >

                    <Image
                      source={getWeatherIcon(
                        day.day?.condition?.text
                      )}

                      style={{
                        width: 44,

                        height: 44,
                      }}

                      resizeMode="contain"
                    />


                    <Text
                      style={{
                        color: 'white',

                        marginTop: 4,
                      }}
                    >

                      {formatDate(
                        day.date
                      )}

                    </Text>


                    <Text
                      style={{
                        color: 'white',

                        fontSize: 18,

                        fontWeight: '600',
                      }}
                    >

                      {Math.round(
                        day.day?.avgtemp_c ?? 0
                      )}&#176;

                    </Text>

                  </View>

                )
              )

            ) : (

              // ============================================
              // FALLBACK
              // ============================================

              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                .map(
                  (day, index) => (

                    <View
                      key={index}

                      style={{
                        flexDirection:
                          'column',

                        justifyContent:
                          'center',

                        alignItems:
                          'center',

                        width: 96,

                        borderRadius: 24,

                        paddingVertical: 12,

                        marginRight: 16,

                        backgroundColor:
                          theme.bgWhite(0.15),
                      }}
                    >

                      <Image
                        source={require(
                          '../assets/icons/cloud.png'
                        )}

                        style={{
                          width: 44,

                          height: 44,
                        }}

                        resizeMode="contain"
                      />


                      <Text
                        style={{
                          color: 'white',

                          marginTop: 4,
                        }}
                      >

                        {day}

                      </Text>


                      <Text
                        style={{
                          color: 'white',

                          fontSize: 18,

                          fontWeight: '600',
                        }}
                      >

                        --&#176;

                      </Text>

                    </View>

                  )
                )

            )}

          </ScrollView>

        </View>

      </SafeAreaView>

    </View>

  );
}