'use client';

import { useEffect } from 'react';
import { App, ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import { setAlovaMessageApi } from '@/api/alova';

const themeVariables = {
  colorBgBase: 'var(--site-color-canvas)',
  colorBorder: 'var(--site-color-border)',
  colorBorderStrong: 'var(--site-color-border-strong)',
  colorCanvas: 'var(--site-color-canvas)',
  colorError: 'var(--site-color-red)',
  colorErrorBg: 'var(--site-color-red-bg)',
  colorInfo: 'var(--site-color-blue)',
  colorInfoBg: 'var(--site-color-blue-bg)',
  colorInk: 'var(--site-color-ink)',
  colorInverse: 'var(--site-color-inverse)',
  colorInverseDisabled: 'var(--site-color-inverse-disabled)',
  colorInverseMuted: 'var(--site-color-inverse-muted)',
  colorInverseSubtle: 'var(--site-color-inverse-subtle)',
  colorMuted: 'var(--site-color-muted)',
  colorPrimary: 'var(--site-color-primary)',
  colorPrimaryHover: 'var(--site-color-primary-hover)',
  colorSuccess: 'var(--site-color-green)',
  colorSuccessBg: 'var(--site-color-green-bg)',
  colorSurface: 'var(--site-color-surface)',
  colorSurfaceActive: 'var(--site-color-surface-active)',
  colorSurfaceHover: 'var(--site-color-surface-hover)',
  colorSurfaceSubtle: 'var(--site-color-surface-subtle)',
  colorText: 'var(--site-color-text)',
  colorTextQuaternary: 'var(--site-color-subtle)',
  colorTextSecondary: 'var(--site-color-muted)',
  colorWarning: 'var(--site-color-yellow)',
  colorWarningBg: 'var(--site-color-yellow-bg)',
  controlFocusShadow: 'var(--site-color-focus)',
  shadowElevated: 'var(--site-shadow-elevated)',
  shadowHandle: 'var(--site-shadow-handle)',
  shadowSoft: 'var(--site-shadow-soft)',
} as const;

function AlovaMessageBridge() {
  const { message } = App.useApp();

  useEffect(() => {
    setAlovaMessageApi(message);

    return () => {
      setAlovaMessageApi(null);
    };
  }, [message]);

  return null;
}

const antdTheme: ThemeConfig = {
  components: {
    Alert: {
      defaultPadding: '12px 14px',
      withDescriptionPadding: '16px',
    },
    Avatar: {
      colorTextPlaceholder: themeVariables.colorMuted,
      containerSize: 32,
      containerSizeLG: 40,
      containerSizeSM: 24,
    },
    Button: {
      defaultActiveBg: themeVariables.colorSurfaceActive,
      defaultActiveBorderColor: themeVariables.colorInk,
      defaultActiveColor: themeVariables.colorInk,
      defaultBg: themeVariables.colorCanvas,
      defaultBorderColor: themeVariables.colorBorderStrong,
      defaultHoverBg: themeVariables.colorSurface,
      defaultHoverBorderColor: themeVariables.colorInk,
      defaultHoverColor: themeVariables.colorInk,
      defaultShadow: 'none',
      fontWeight: 500,
      primaryColor: themeVariables.colorCanvas,
      primaryShadow: 'none',
      solidTextColor: themeVariables.colorCanvas,
    },
    Card: {
      actionsBg: themeVariables.colorSurface,
      bodyPadding: 20,
      extraColor: themeVariables.colorMuted,
      headerBg: themeVariables.colorCanvas,
      headerFontSize: 15,
    },
    Descriptions: {
      contentColor: themeVariables.colorText,
      extraColor: themeVariables.colorMuted,
      labelBg: themeVariables.colorSurface,
      labelColor: themeVariables.colorMuted,
      titleColor: themeVariables.colorInk,
    },
    Dropdown: {
      borderRadiusLG: 8,
      boxShadowSecondary: themeVariables.shadowElevated,
      controlItemBgActive: themeVariables.colorSurfaceActive,
      controlItemBgHover: themeVariables.colorSurfaceHover,
      colorBgElevated: themeVariables.colorCanvas,
    },
    Form: {
      labelColor: themeVariables.colorText,
      labelRequiredMarkColor: themeVariables.colorError,
    },
    Input: {
      activeBg: themeVariables.colorCanvas,
      activeBorderColor: themeVariables.colorInk,
      activeShadow: `0 0 0 3px ${themeVariables.controlFocusShadow}`,
      addonBg: themeVariables.colorSurface,
      hoverBg: themeVariables.colorCanvas,
      hoverBorderColor: themeVariables.colorInk,
    },
    Layout: {
      bodyBg: themeVariables.colorSurface,
      footerBg: themeVariables.colorCanvas,
      headerBg: themeVariables.colorCanvas,
      headerColor: themeVariables.colorText,
      lightSiderBg: themeVariables.colorInk,
      siderBg: themeVariables.colorInk,
      triggerBg: themeVariables.colorPrimaryHover,
      triggerColor: themeVariables.colorInverse,
    },
    Menu: {
      darkItemBg: themeVariables.colorInk,
      darkDangerItemColor: themeVariables.colorError,
      darkDangerItemHoverColor: themeVariables.colorError,
      darkDangerItemSelectedColor: themeVariables.colorError,
      darkGroupTitleColor: themeVariables.colorInverseSubtle,
      darkItemColor: themeVariables.colorInverseMuted,
      darkItemDisabledColor: themeVariables.colorInverseDisabled,
      darkItemHoverBg: themeVariables.colorPrimaryHover,
      darkItemHoverColor: themeVariables.colorInverse,
      darkItemSelectedBg: themeVariables.colorInverse,
      darkItemSelectedColor: themeVariables.colorInk,
      darkPopupBg: themeVariables.colorInk,
      darkSubMenuItemBg: themeVariables.colorInk,
      itemActiveBg: themeVariables.colorSurfaceActive,
      itemBg: themeVariables.colorCanvas,
      itemBorderRadius: 6,
      itemColor: themeVariables.colorText,
      itemHoverBg: themeVariables.colorSurfaceHover,
      itemHoverColor: themeVariables.colorInk,
      itemSelectedBg: themeVariables.colorInk,
      itemSelectedColor: themeVariables.colorCanvas,
      popupBg: themeVariables.colorCanvas,
      subMenuItemBg: themeVariables.colorCanvas,
    },
    Message: {
      contentBg: themeVariables.colorCanvas,
      contentPadding: '10px 14px',
      boxShadow: themeVariables.shadowElevated,
    },
    Modal: {
      contentBg: themeVariables.colorCanvas,
      footerBg: themeVariables.colorCanvas,
      headerBg: themeVariables.colorCanvas,
      titleColor: themeVariables.colorInk,
    },
    Pagination: {
      itemActiveBg: themeVariables.colorInk,
      itemActiveColor: themeVariables.colorCanvas,
      itemActiveColorHover: themeVariables.colorCanvas,
      itemBg: themeVariables.colorCanvas,
      itemInputBg: themeVariables.colorCanvas,
      itemLinkBg: themeVariables.colorCanvas,
    },
    Popconfirm: {
      colorBgElevated: themeVariables.colorCanvas,
    },
    Progress: {
      circleTextColor: themeVariables.colorText,
      defaultColor: themeVariables.colorInk,
      remainingColor: themeVariables.colorSurfaceActive,
    },
    Select: {
      activeBorderColor: themeVariables.colorInk,
      activeOutlineColor: themeVariables.controlFocusShadow,
      hoverBorderColor: themeVariables.colorInk,
      optionActiveBg: themeVariables.colorSurfaceHover,
      optionSelectedBg: themeVariables.colorSurfaceActive,
      optionSelectedColor: themeVariables.colorInk,
      selectorBg: themeVariables.colorCanvas,
    },
    Skeleton: {
      blockRadius: 6,
      gradientFromColor: themeVariables.colorSurfaceSubtle,
      gradientToColor: themeVariables.colorSurfaceActive,
    },
    Spin: {
      colorPrimary: themeVariables.colorInk,
    },
    Statistic: {
      colorTextDescription: themeVariables.colorMuted,
      colorTextHeading: themeVariables.colorInk,
      contentFontSize: 28,
      titleFontSize: 13,
    },
    Switch: {
      handleBg: themeVariables.colorCanvas,
      handleShadow: themeVariables.shadowHandle,
    },
    Table: {
      bodySortBg: themeVariables.colorSurface,
      borderColor: themeVariables.colorBorder,
      expandIconBg: themeVariables.colorCanvas,
      filterDropdownBg: themeVariables.colorCanvas,
      filterDropdownMenuBg: themeVariables.colorCanvas,
      fixedHeaderSortActiveBg: themeVariables.colorSurfaceActive,
      footerBg: themeVariables.colorSurface,
      footerColor: themeVariables.colorMuted,
      headerBg: themeVariables.colorSurface,
      headerBorderRadius: 6,
      headerColor: themeVariables.colorText,
      headerFilterHoverBg: themeVariables.colorSurfaceHover,
      headerSortActiveBg: themeVariables.colorSurfaceActive,
      headerSortHoverBg: themeVariables.colorSurfaceHover,
      headerSplitColor: themeVariables.colorBorder,
      rowExpandedBg: themeVariables.colorSurface,
      rowHoverBg: themeVariables.colorSurface,
      rowSelectedBg: themeVariables.colorSurfaceActive,
      rowSelectedHoverBg: themeVariables.colorSurfaceHover,
      stickyScrollBarBg: themeVariables.colorBorderStrong,
    },
    Tabs: {
      cardBg: themeVariables.colorSurface,
      inkBarColor: themeVariables.colorInk,
      itemActiveColor: themeVariables.colorInk,
      itemColor: themeVariables.colorMuted,
      itemHoverColor: themeVariables.colorInk,
      itemSelectedColor: themeVariables.colorInk,
    },
    Tag: {
      defaultBg: themeVariables.colorSurface,
      defaultColor: themeVariables.colorText,
      solidTextColor: themeVariables.colorCanvas,
    },
    Tooltip: {
      colorBgSpotlight: themeVariables.colorInk,
      colorTextLightSolid: themeVariables.colorCanvas,
    },
    Tree: {
      directoryNodeSelectedBg: themeVariables.colorInk,
      directoryNodeSelectedColor: themeVariables.colorCanvas,
      nodeHoverBg: themeVariables.colorSurfaceHover,
      nodeHoverColor: themeVariables.colorInk,
      nodeSelectedBg: themeVariables.colorSurfaceActive,
      nodeSelectedColor: themeVariables.colorInk,
    },
    TreeSelect: {
      nodeHoverBg: themeVariables.colorSurfaceHover,
      nodeHoverColor: themeVariables.colorInk,
      nodeSelectedBg: themeVariables.colorSurfaceActive,
      nodeSelectedColor: themeVariables.colorInk,
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
    Upload: {
      actionsColor: themeVariables.colorMuted,
    },
  },
  token: {
    borderRadius: 6,
    colorBgBase: themeVariables.colorBgBase,
    colorBgContainer: themeVariables.colorCanvas,
    colorBgElevated: themeVariables.colorCanvas,
    colorBgLayout: themeVariables.colorSurface,
    colorBorder: themeVariables.colorBorder,
    colorBorderSecondary: themeVariables.colorBorder,
    colorError: themeVariables.colorError,
    colorErrorBg: themeVariables.colorErrorBg,
    colorFillAlter: themeVariables.colorSurface,
    colorFillSecondary: themeVariables.colorSurfaceHover,
    colorFillTertiary: themeVariables.colorSurfaceSubtle,
    colorInfo: themeVariables.colorInfo,
    colorInfoBg: themeVariables.colorInfoBg,
    colorLink: themeVariables.colorInk,
    colorLinkActive: themeVariables.colorPrimaryHover,
    colorLinkHover: themeVariables.colorPrimaryHover,
    colorPrimary: themeVariables.colorPrimary,
    colorPrimaryBg: themeVariables.colorSurface,
    colorPrimaryBgHover: themeVariables.colorSurfaceHover,
    colorPrimaryHover: themeVariables.colorPrimaryHover,
    colorSuccess: themeVariables.colorSuccess,
    colorSuccessBg: themeVariables.colorSuccessBg,
    colorText: themeVariables.colorText,
    colorTextBase: themeVariables.colorText,
    colorTextDescription: themeVariables.colorMuted,
    colorTextDisabled: themeVariables.colorTextQuaternary,
    colorTextHeading: themeVariables.colorInk,
    colorTextLabel: themeVariables.colorMuted,
    colorTextLightSolid: themeVariables.colorCanvas,
    colorTextPlaceholder: themeVariables.colorTextQuaternary,
    colorTextQuaternary: themeVariables.colorTextQuaternary,
    colorTextSecondary: themeVariables.colorTextSecondary,
    colorWarning: themeVariables.colorWarning,
    colorWarningBg: themeVariables.colorWarningBg,
    colorWarningBorder: themeVariables.colorWarning,
    controlHeight: 36,
    controlItemBgActive: themeVariables.colorSurfaceActive,
    controlItemBgHover: themeVariables.colorSurfaceHover,
    controlOutline: themeVariables.controlFocusShadow,
    fontFamily: 'thicccboi, Helvetica, Arial, sans-serif',
    boxShadow: themeVariables.shadowSoft,
    boxShadowSecondary: themeVariables.shadowElevated,
    wireframe: false,
  },
};

export default function AntdProvider({ children }: IComponent.ChildrenProps) {
  return (
    <ConfigProvider theme={antdTheme}>
      <App>
        <AlovaMessageBridge />
        {children}
      </App>
    </ConfigProvider>
  );
}
