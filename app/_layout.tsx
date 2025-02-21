import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, //Set it to false to hide the header. Default sucks.
      }}
    />
  );
}
