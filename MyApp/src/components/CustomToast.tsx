import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import {
  BaseToast,
} from 'react-native-toast-message';

import {
  Ionicons,
} from '@expo/vector-icons';

export const toastConfig = {
  success: (props: any) => (
    <View
      style={[
        styles.container,
        styles.successBorder,
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                'rgba(34,197,94,0.12)',
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#22C55E"
          />
        </View>

        <View
          style={styles.textWrap}
        >
          <Text
            style={
              styles.title
            }
          >
            {
              props.text1
            }
          </Text>

          {!!props.text2 && (
            <Text
              style={
                styles.subtitle
              }
            >
              {
                props.text2
              }
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={
          props.hide
        }
      >
        <Ionicons
          name="close"
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>
    </View>
  ),

  error: (props: any) => (
    <View
      style={[
        styles.container,
        styles.errorBorder,
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                'rgba(239,68,68,0.12)',
            },
          ]}
        >
          <Ionicons
            name="warning"
            size={22}
            color="#EF4444"
          />
        </View>

        <View
          style={styles.textWrap}
        >
          <Text
            style={
              styles.title
            }
          >
            {
              props.text1
            }
          </Text>

          {!!props.text2 && (
            <Text
              style={
                styles.subtitle
              }
            >
              {
                props.text2
              }
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={
          props.hide
        }
      >
        <Ionicons
          name="close"
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>
    </View>
  ),
};

const styles =
StyleSheet.create({
  container: {
    width: '92%',
    backgroundColor:
      '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 50,
    flexDirection:
      'row',
    justifyContent:
      'space-between',
    alignItems:
      'center',

    shadowColor:
      '#000',

    shadowOpacity:
      0.12,

    shadowRadius:
      18,

    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 10,
  },

  left: {
    flexDirection:
      'row',
    alignItems:
      'center',
    flex: 1,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent:
      'center',
    alignItems:
      'center',
  },

  textWrap: {
    marginLeft: 12,
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  subtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 13,
  },

  successBorder: {
    borderLeftWidth: 5,
    borderLeftColor:
      '#22C55E',
  },

  errorBorder: {
    borderLeftWidth: 5,
    borderLeftColor:
      '#EF4444',
  },
});