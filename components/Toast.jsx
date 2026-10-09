import {Text, motion, transitions} from '@ps5-react/core';

export function Toast({text}) {
  return (
    <motion.View className="absolute right-12 bottom-10 px-5 py-3 rounded-2xl bg-panel/95 border border-white/15"
      initial={{opacity: 0, y: 24}} animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: 12, transition: transitions.exit}} transition={transitions.panel}>
      <Text className="font-inter text-sm text-white">{text}</Text>
    </motion.View>
  );
}
