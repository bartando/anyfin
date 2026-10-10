import {FocusScope, Text, View} from '@ps5-react/core';
import {logOut} from '../lib/jellyfin/auth.js';
import {Button} from '../components/Button.jsx';
import {BackIcon, ServerIcon} from '../components/Icons.jsx';

/** Who is signed in where, with Sign Out (which returns to the sign-in screen). */
export function AccountPage({session, active = true, onClose}) {
  return (
    <FocusScope trap={active} inert={!active} autoFocus onBack={() => { onClose(); return true; }} onAction={() => true}>
      <View className="w-screen h-screen bg-canvas">
        <View pointerEvents="none" className="absolute inset-0 bg-gradient-to-br from-accent/20 via-canvas to-canvas" />
        <View className="absolute left-12 top-[120px] w-[680px] gap-3">
          <Text className="font-semi text-xs text-accent-soft tracking-widest">ACCOUNT</Text>
          <Text className="font-semi text-xl text-white">{session.userName}</Text>
          <View className="flex-row items-center gap-3">
            <ServerIcon size={18} color="#a9a0ff" />
            <Text className="font-inter text-md text-slate-300">{session.serverName} · {session.server}</Text>
          </View>
          <View className="flex-row gap-4 pt-4">
            <Button label="Sign Out" primary onPress={logOut} />
            <Button label="Back" icon={BackIcon} onPress={onClose} />
          </View>
        </View>
      </View>
    </FocusScope>
  );
}
