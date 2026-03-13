import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  size?: number;
};

export default function FacebookIcon({ size = 22 }: Props) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="12" fill="#1877F2" />
      <Path
        fill="#FFFFFF"
        d="M14.25 23.7V14.9h2.95l.44-3.43h-3.39V9.28c0-.99.27-1.67 1.7-1.67h1.82V4.54c-.31-.05-1.39-.14-2.64-.14-2.62 0-4.41 1.6-4.41 4.53v2.54H7.76v3.43h2.96v8.8h3.53z"
      />
    </Svg>
  );
}
