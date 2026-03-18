import React from "react";
import DocsRedirectPage from "@site/src/components/DocsRedirectPage";

export default function ZhCnTutorialsCategoryAlias(): JSX.Element {
  return (
    <DocsRedirectPage
      to="/zh-CN/docs/category/教程"
      message="正在跳转到中文“教程”分类..."
    />
  );
}
