import React, {useEffect, useMemo, useRef, useState} from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {useLocation} from "@docusaurus/router";
import DropdownNavbarItem from "@theme/NavbarItem/DropdownNavbarItem";
import clsx from "clsx";
import styles from "./styles.module.css";

type LanguageKey = "en" | "zh-CN";

type LanguageOption = {
  key: LanguageKey;
  label: string;
  menuLabel?: string;
  flag: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {key: "en", label: "English", flag: "🇺🇸"},
  {
    key: "zh-CN",
    label: "简体中文",
    menuLabel: "简体中文（预览）",
    flag: "🇨🇳",
  },
];

const EN_TO_ZH_EXACT: Record<string, string> = {
  "/docs": "/zh-CN/docs",
  "/docs/category/getting-started": "/zh-CN/docs/category/getting-started",
  "/docs/category/guides": "/zh-CN/docs/category/guides",
  "/docs/category/tutorials": "/zh-CN/docs/category/tutorials",
  "/docs/category/mcp-servers": "/zh-CN/docs/category/mcp-servers",
  "/docs/category/architecture-overview": "/zh-CN/docs/category/architecture-overview",
  "/docs/category/experimental": "/zh-CN/docs/category/experimental",
  "/docs/category/troubleshooting": "/zh-CN/docs/category/troubleshooting",
};

const ZH_TO_EN_EXACT: Record<string, string> = {
  "/zh-CN/docs": "/docs",
  "/zh-CN/docs/category/getting-started": "/docs/category/getting-started",
  "/zh-CN/docs/category/guides": "/docs/category/guides",
  "/zh-CN/docs/category/tutorials": "/docs/category/tutorials",
  "/zh-CN/docs/category/mcp-servers": "/docs/category/mcp-servers",
  "/zh-CN/docs/category/architecture-overview": "/docs/category/architecture-overview",
  "/zh-CN/docs/category/experimental": "/docs/category/experimental",
  "/zh-CN/docs/category/troubleshooting": "/docs/troubleshooting",
  "/zh-CN/docs/category/开始": "/docs/category/getting-started",
  "/zh-CN/docs/category/指南": "/docs/category/guides",
  "/zh-CN/docs/category/教程": "/docs/category/tutorials",
  "/zh-CN/docs/category/架构概览": "/docs/category/architecture-overview",
  "/zh-CN/docs/experimental": "/docs/category/experimental",
  "/zh-CN/docs/troubleshooting": "/docs/troubleshooting",
};

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function stripBaseUrl(pathname: string, baseUrl: string): string {
  const normalizedBaseUrl =
    baseUrl.length > 1 && baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;

  if (pathname === normalizedBaseUrl) {
    return "/";
  }

  if (pathname.startsWith(`${normalizedBaseUrl}/`)) {
    return pathname.slice(normalizedBaseUrl.length);
  }

  return pathname;
}

function getCurrentLanguage(relativePath: string): LanguageKey {
  return relativePath.startsWith("/zh-CN/docs") ? "zh-CN" : "en";
}

function isDocsPath(relativePath: string): boolean {
  return (
    relativePath === "/docs" ||
    relativePath.startsWith("/docs/") ||
    relativePath === "/zh-CN/docs" ||
    relativePath.startsWith("/zh-CN/docs/")
  );
}

function getTargetDocsPath(
  relativePath: string,
  targetLanguage: LanguageKey,
): string {
  const normalizedPath = normalizePath(relativePath);

  if (targetLanguage === "zh-CN") {
    if (EN_TO_ZH_EXACT[normalizedPath]) {
      return EN_TO_ZH_EXACT[normalizedPath];
    }
    if (normalizedPath.startsWith("/docs/")) {
      return normalizedPath.replace(/^\/docs/, "/zh-CN/docs");
    }
    if (normalizedPath.startsWith("/zh-CN/docs")) {
      return normalizedPath;
    }
    return "/zh-CN/docs/quickstart";
  }

  if (ZH_TO_EN_EXACT[normalizedPath]) {
    return ZH_TO_EN_EXACT[normalizedPath];
  }
  if (normalizedPath.startsWith("/zh-CN/docs/")) {
    return normalizedPath.replace(/^\/zh-CN\/docs/, "/docs");
  }
  if (normalizedPath.startsWith("/docs")) {
    return normalizedPath;
  }
  return "/docs/quickstart";
}

export default function DocsLanguageDropdownNavbarItem({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  const {siteConfig} = useDocusaurusContext();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const relativePath = useMemo(
    () => normalizePath(stripBaseUrl(location.pathname, siteConfig.baseUrl)),
    [location.pathname, siteConfig.baseUrl],
  );

  if (!isDocsPath(relativePath)) {
    return null;
  }

  const currentLanguage = getCurrentLanguage(relativePath);

  const items = useMemo(() => {
    return LANGUAGE_OPTIONS.map((option) => {
      const basePath = getTargetDocsPath(relativePath, option.key);
      const to = `${basePath}${location.search}${location.hash}`;
      const isCurrent = option.key === currentLanguage;

      return {
        ...option,
        to,
        isCurrent,
        mobileLabel: `${option.flag} ${option.menuLabel ?? option.label}`,
        desktopLabel: `${option.flag} ${option.menuLabel ?? option.label}${isCurrent ? " ✓" : ""}`,
      };
    });
  }, [currentLanguage, location.hash, location.search, relativePath]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (mobile) {
    return (
      <DropdownNavbarItem
        mobile
        label={`🌐 ${
          LANGUAGE_OPTIONS.find((option) => option.key === currentLanguage)
            ?.label ?? "Language"
        }`}
        items={items.map((item) => ({
          label: item.mobileLabel,
          to: item.to,
          target: "_self",
          className: item.isCurrent ? "menu__link--active" : "",
        }))}
      />
    );
  }

  const currentOption =
    LANGUAGE_OPTIONS.find((option) => option.key === currentLanguage) ??
    LANGUAGE_OPTIONS[0];

  return (
    <div ref={dropdownRef} className={clsx("navbar__item", styles.wrapper)}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Switch docs language"
        onClick={() => setIsOpen((open) => !open)}>
        <span className={styles.flag} aria-hidden="true">
          {currentOption.flag}
        </span>
        <span className={styles.label}>{currentOption.label}</span>
        <span
          className={clsx(styles.chevron, {
            [styles.chevronOpen]: isOpen,
          })}
          aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <ul className={styles.menu} role="menu">
          {items.map((item) => (
            <li key={item.key} className={styles.menuItemWrapper} role="none">
              <Link
                to={item.to}
                className={clsx(styles.menuItem, {
                  [styles.menuItemActive]: item.isCurrent,
                })}
                role="menuitem"
                onClick={() => setIsOpen(false)}>
                <span className={styles.flag} aria-hidden="true">
                  {item.flag}
                </span>
                <span className={styles.label}>{item.label}</span>
                {item.isCurrent ? (
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
