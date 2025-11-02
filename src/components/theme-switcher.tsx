import React from "react";
import { Switch, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTheme } from "@heroui/use-theme";

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Tooltip
      content={`Switch to ${isDark ? "light" : "dark"} mode`}
      placement="bottom"
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`text-xl ${!isDark ? "text-warning" : "text-default-500"}`}
          icon="lucide:sun"
        />
        <Switch
          color="primary"
          isSelected={isDark}
          size="sm"
          onValueChange={handleToggle}
        />
        <Icon
          className={`text-xl ${isDark ? "text-primary" : "text-default-500"}`}
          icon="lucide:moon"
        />
      </div>
    </Tooltip>
  );
};
