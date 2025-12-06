#!/bin/bash
# 版本号管理脚本
# 作者: wangqiupei
# 用法: ./scripts/bump-version.sh <version>
#   例如: ./scripts/bump-version.sh 1.2.1
#   或: ./scripts/bump-version.sh patch  (自动递增补丁版本)
#   或: ./scripts/bump-version.sh minor  (自动递增次版本)
#   或: ./scripts/bump-version.sh major  (自动递增主版本)

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 配置文件路径
PACKAGE_JSON="package.json"
TAURI_CONF="src-tauri/tauri.conf.json"
CARGO_TOML="src-tauri/Cargo.toml"

# 检查必要文件是否存在
check_files() {
    local missing_files=()

    [ ! -f "$PACKAGE_JSON" ] && missing_files+=("$PACKAGE_JSON")
    [ ! -f "$TAURI_CONF" ] && missing_files+=("$TAURI_CONF")
    [ ! -f "$CARGO_TOML" ] && missing_files+=("$CARGO_TOML")

    if [ ${#missing_files[@]} -ne 0 ]; then
        echo -e "${RED}❌ 错误: 以下文件不存在:${NC}"
        printf '%s\n' "${missing_files[@]}"
        exit 1
    fi
}

# 获取当前版本号（从 package.json）
get_current_version() {
    grep '"version"' "$PACKAGE_JSON" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

# 解析版本号为数组 [major, minor, patch]
parse_version() {
    local version=$1
    IFS='.' read -ra VERSION_PARTS <<< "$version"
    echo "${VERSION_PARTS[@]}"
}

# 自动递增版本号
increment_version() {
    local current_version=$1
    local increment_type=$2

    read -r major minor patch <<< "$(parse_version "$current_version")"

    case "$increment_type" in
        major)
            ((major++))
            minor=0
            patch=0
            ;;
        minor)
            ((minor++))
            patch=0
            ;;
        patch)
            ((patch++))
            ;;
        *)
            echo -e "${RED}❌ 错误: 无效的递增类型: $increment_type${NC}"
            exit 1
            ;;
    esac

    echo "$major.$minor.$patch"
}

# 验证版本号格式
validate_version() {
    local version=$1
    if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}❌ 错误: 版本号格式无效: $version${NC}"
        echo -e "${YELLOW}   期望格式: major.minor.patch (例如: 1.2.1)${NC}"
        exit 1
    fi
}

# 更新 package.json 版本号
update_package_json() {
    local new_version=$1
    echo -e "${YELLOW}📝 更新 $PACKAGE_JSON${NC}"

    # macOS 和 Linux 的 sed 命令不同
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
    fi
}

# 更新 tauri.conf.json 版本号
update_tauri_conf() {
    local new_version=$1
    echo -e "${YELLOW}📝 更新 $TAURI_CONF${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$new_version\"/" "$TAURI_CONF"
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"$new_version\"/" "$TAURI_CONF"
    fi
}

# 更新 Cargo.toml 版本号
update_cargo_toml() {
    local new_version=$1
    echo -e "${YELLOW}📝 更新 $CARGO_TOML${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "0,/^version = \".*\"/s//version = \"$new_version\"/" "$CARGO_TOML"
    else
        sed -i "0,/^version = \".*\"/s//version = \"$new_version\"/" "$CARGO_TOML"
    fi
}

# 验证版本号一致性
verify_versions() {
    local expected_version=$1

    echo -e "${YELLOW}🔍 验证版本号一致性...${NC}"

    local package_version=$(grep '"version"' "$PACKAGE_JSON" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    local tauri_version=$(grep '"version"' "$TAURI_CONF" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    local cargo_version=$(grep '^version' "$CARGO_TOML" | head -1 | sed 's/version = "\(.*\)"/\1/')

    local all_match=true

    if [ "$package_version" != "$expected_version" ]; then
        echo -e "${RED}❌ $PACKAGE_JSON 版本号不匹配: $package_version${NC}"
        all_match=false
    fi

    if [ "$tauri_version" != "$expected_version" ]; then
        echo -e "${RED}❌ $TAURI_CONF 版本号不匹配: $tauri_version${NC}"
        all_match=false
    fi

    if [ "$cargo_version" != "$expected_version" ]; then
        echo -e "${RED}❌ $CARGO_TOML 版本号不匹配: $cargo_version${NC}"
        all_match=false
    fi

    if [ "$all_match" = true ]; then
        echo -e "${GREEN}✅ 所有文件版本号一致: $expected_version${NC}"
        return 0
    else
        echo -e "${RED}❌ 版本号不一致，请检查${NC}"
        return 1
    fi
}

# 显示使用帮助
show_help() {
    cat << EOF
版本号管理脚本

用法:
  $0 <version>           设置具体版本号
  $0 patch              自动递增补丁版本 (x.x.N)
  $0 minor              自动递增次版本 (x.N.0)
  $0 major              自动递增主版本 (N.0.0)

示例:
  $0 1.2.1              # 设置版本号为 1.2.1
  $0 patch              # 从 1.2.0 递增到 1.2.1
  $0 minor              # 从 1.2.0 递增到 1.3.0
  $0 major              # 从 1.2.0 递增到 2.0.0

文件:
  - package.json
  - src-tauri/tauri.conf.json
  - src-tauri/Cargo.toml
EOF
}

# 主函数
main() {
    # 检查参数
    if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi

    echo -e "${GREEN}🚀 Antigravity Agent 版本号更新工具${NC}"
    echo ""

    # 检查必要文件
    check_files

    # 获取当前版本
    local current_version=$(get_current_version)
    echo -e "当前版本: ${YELLOW}$current_version${NC}"

    # 确定新版本号
    local new_version
    case "$1" in
        patch|minor|major)
            new_version=$(increment_version "$current_version" "$1")
            echo -e "递增类型: ${YELLOW}$1${NC}"
            ;;
        *)
            new_version=$1
            validate_version "$new_version"
            ;;
    esac

    echo -e "新版本: ${GREEN}$new_version${NC}"
    echo ""

    # 确认更新
    read -p "确认更新版本号? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ 已取消${NC}"
        exit 0
    fi

    # 更新所有文件
    update_package_json "$new_version"
    update_tauri_conf "$new_version"
    update_cargo_toml "$new_version"

    echo ""

    # 验证一致性
    if verify_versions "$new_version"; then
        echo ""
        echo -e "${GREEN}✅ 版本号更新成功！${NC}"
        echo ""
        echo -e "${YELLOW}下一步:${NC}"
        echo "  1. git add ."
        echo "  2. git commit -m \"chore: bump version to $new_version\""
        echo "  3. git tag v$new_version"
        echo "  4. git push origin dev --tags"
    else
        exit 1
    fi
}

# 执行主函数
main "$@"
