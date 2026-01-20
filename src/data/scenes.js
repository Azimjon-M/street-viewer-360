// Sample scene data structure for 360° panoramas
// Replace these with your actual Insta360 X5 equirectangular images

export const scenesData = [
    {
        id: 'scene1',
        title: 'Bosh manzil',
        description: 'Virtual sayohatning boshlanishi',
        image: '/panoramas/scene1.jpg', // Replace with your actual image path
        initialView: {
            pitch: 0,
            yaw: 0,
            hfov: 100
        },
        hotspots: [
            {
                id: 'hotspot1',
                type: 'custom',
                pitch: -5,
                yaw: 45,
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    hotSpotDiv.innerHTML = `
            <div class="hotspot-tooltip">
              <span>Keyingi manzilga o'tish</span>
            </div>
          `;
                },
                clickHandlerFunc: () => 'scene2'
            },
            {
                id: 'hotspot2',
                type: 'custom',
                pitch: 0,
                yaw: -90,
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    hotSpotDiv.innerHTML = `
            <div class="hotspot-tooltip">
              <span>Boshqa yo'nalish</span>
            </div>
          `;
                },
                clickHandlerFunc: () => 'scene3'
            }
        ]
    },
    {
        id: 'scene2',
        title: 'Ikkinchi manzil',
        description: 'Davom etish',
        image: '/panoramas/scene2.jpg',
        initialView: {
            pitch: 0,
            yaw: 180,
            hfov: 100
        },
        hotspots: [
            {
                id: 'hotspot3',
                type: 'custom',
                pitch: -3,
                yaw: 180,
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    hotSpotDiv.innerHTML = `
            <div class="hotspot-tooltip">
              <span>Boshiga qaytish</span>
            </div>
          `;
                },
                clickHandlerFunc: () => 'scene1'
            },
            {
                id: 'hotspot4',
                type: 'custom',
                pitch: 5,
                yaw: 90,
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    hotSpotDiv.innerHTML = `
            <div class="hotspot-tooltip">
              <span>Uchinchi manzilga</span>
            </div>
          `;
                },
                clickHandlerFunc: () => 'scene3'
            }
        ]
    },
    {
        id: 'scene3',
        title: 'Uchinchi manzil',
        description: 'Oxirgi nuqta',
        image: '/panoramas/scene3.jpg',
        initialView: {
            pitch: 0,
            yaw: 0,
            hfov: 100
        },
        hotspots: [
            {
                id: 'hotspot5',
                type: 'custom',
                pitch: 0,
                yaw: -45,
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    hotSpotDiv.innerHTML = `
            <div class="hotspot-tooltip">
              <span>Boshiga qaytish</span>
            </div>
          `;
                },
                clickHandlerFunc: () => 'scene1'
            }
        ]
    }
];

// Helper function to get scene by ID
export const getSceneById = (id) => {
    return scenesData.find(scene => scene.id === id);
};
