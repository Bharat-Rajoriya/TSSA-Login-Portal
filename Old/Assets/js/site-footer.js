const siteFooterConfig = {
    logoHref: "#",
    logoSrc: "/Assets/images/Logo/logo.svg",
    logoAlt: "TSSA",
    logoWidth: 120,
    taglineLines: ["PARTNERING", "FOR A", "SAFE ONTARIO"],
    homePageHref: "https://tssa.org/",
    homePageText: "Back to TSSA Homepage",
    copyrightText: "Copyright © 2023 TSSA",
    links: [
        { href: "https://www.tssa.org/report-incident", text: "Report an Incident" },
        { href: "https://www.tssa.org/contact-us", text: "Contact Us" },
        { href: "https://www.tssa.org/subscribe", text: "Subscribe to TSSA News" },
        { href: "https://www.tssa.org/tssa-careers", text: "Careers" },
        { href: "https://www.tssa.org/privacy", text: "Privacy Policy" },
        { href: "https://www.tssa.org/accessibility", text: "Accessibility" }
    ]
};

function renderSiteFooter(){
    const footer = document.getElementById("siteFooter");

    if(!footer){
        return;
    }

    const footerLinks = siteFooterConfig.links.map(function(link){
        return `<li><a href="${link.href}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>`;
    }).join("");

    footer.innerHTML = `
        <div class="footerTop">
            <div class="footerTopLeft">
                <a href="${siteFooterConfig.logoHref}" target="_blank" rel="noopener noreferrer">
                    <img src="${siteFooterConfig.logoSrc}" alt="${siteFooterConfig.logoAlt}" width="${siteFooterConfig.logoWidth}px">
                </a>
                <h4>${siteFooterConfig.taglineLines.join("<br>")}</h4>
            </div>
            <div class="footerTopRight">
                <a class="footer-action-link" href="${siteFooterConfig.homePageHref}" target="_blank" rel="noopener noreferrer">${siteFooterConfig.homePageText}</a>
            </div>
        </div>
        <div class="footerbottom">
            <ul class="footerNav">
                ${footerLinks}
            </ul>
            <p class="footer-copyright-tag">${siteFooterConfig.copyrightText}</p>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", renderSiteFooter);
