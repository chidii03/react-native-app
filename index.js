import * as KeepAwake from "expo-keep-awake";

const swallowKeepAwakeError = (error) => {
  const message = String(error?.message ?? error ?? "");
  if (message.toLowerCase().includes("unable to activate keep awake")) {
    console.warn("[keep-awake] Ignored:", message);
    return true;
  }
  return false;
};

const originalActivate = KeepAwake.activateKeepAwakeAsync?.bind(KeepAwake);
if (originalActivate) {
  KeepAwake.activateKeepAwakeAsync = async (...args) => {
    try {
      return await originalActivate(...args);
    } catch (error) {
      if (swallowKeepAwakeError(error)) return;
      throw error;
    }
  };
}

const originalActivateSync = KeepAwake.activateKeepAwake?.bind(KeepAwake);
if (originalActivateSync) {
  KeepAwake.activateKeepAwake = (...args) => {
    try {
      return originalActivateSync(...args);
    } catch (error) {
      if (swallowKeepAwakeError(error)) return;
      throw error;
    }
  };
}

const originalDeactivate = KeepAwake.deactivateKeepAwake?.bind(KeepAwake);
if (originalDeactivate) {
  KeepAwake.deactivateKeepAwake = (...args) => {
    try {
      return originalDeactivate(...args);
    } catch (error) {
      if (swallowKeepAwakeError(error)) return;
      throw error;
    }
  };
}

import "expo-router/entry";
