import React from "react";
import DocsRedirectPage from "@site/src/components/DocsRedirectPage";

export default function ZhCnGuidesCategoryAlias(): JSX.Element {
  return (
    <DocsRedirectPage
      to="/zh-CN/docs/category/指南"
      message="正在跳转到中文“指南”分类..."
    />
  );
}
