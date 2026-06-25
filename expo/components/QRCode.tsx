import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface QRCodeProps {
  value: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
}

export default function QRCode({ 
  value, 
  size = 200, 
  backgroundColor = 'white',
  color = 'black' 
}: QRCodeProps) {
  const encodedValue = encodeURIComponent(value);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&bgcolor=${backgroundColor.replace('#', '')}&color=${color.replace('#', '')}`;

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
      <Image
        source={{ uri: qrApiUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});