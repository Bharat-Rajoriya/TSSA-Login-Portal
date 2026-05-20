const siteNavConfig = {
    logoHref: "/",
    logoSrc: "/Assets/images/Logo/logo.svg",
    logoAlt: "TSSA LOGO",
    logoWidth: 95,
    logoheight: 100,
    homePageHref: "https://tssa.org/",
    homePageText: "Back to TSSA Homepage"
};

function renderSiteNav(){
    const nav = document.getElementById("siteNav");

    if(!nav){
        return;
    }

    nav.innerHTML = `
        <a href="${siteNavConfig.logoHref}">
            <img src="${siteNavConfig.logoSrc}" alt="${siteNavConfig.logoAlt}" width="${siteNavConfig.logoWidth}px" height="${siteNavConfig.logoheight}">
        </a>
        <a class="nav-action-link" href="${siteNavConfig.homePageHref}" target="_blank" rel="noopener noreferrer">${siteNavConfig.homePageText}</a>
    `;
}

document.addEventListener("DOMContentLoaded", renderSiteNav);
