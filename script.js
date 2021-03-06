const video = document.getElementById("video")
function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => (video.srcObject = stream),
        err => console.error(err)
    )
}

const loadLabels = async () => {
    const response = await axios('https://hieutranvu.herokuapp.com/employees');
    console.log(response.data.data)
    let emmployee = response.data.data.filter(function (e) {
        return e.image.length > 0;
    });
    const labels = emmployee.map(function (data) {
        return data.name
    })
    return Promise.all(emmployee.map(async label => {
        const descriptions = []
        for (let i = 0; i < label.image.length; i++) {
            const img1 = await faceapi.fetchImage(label.image[i])

            const detections = await faceapi
                .detectSingleFace(img1)
                .withFaceLandmarks()
                .withFaceDescriptor()
            descriptions.push(detections.descriptor)
            return new faceapi.LabeledFaceDescriptors(label._id, descriptions)
        }
    }))
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/html-tvh/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/html-tvh/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/html-tvh/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/html-tvh/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/html-tvh/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/html-tvh/models'),
]).then(startVideo)


video.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    const canvasSize = {
        width: video.width,
        height: video.height
    }
    const labels = await loadLabels()
    faceapi.matchDimensions(canvas, canvasSize)
    document.body.appendChild(canvas)
    await setInterval(async () => {
        const response = await axios('https://hieutranvu.herokuapp.com/employees');
        const detections = await faceapi
            .detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors()
        const resizedDetections = faceapi.resizeResults(detections, canvasSize)
        const faceMatcher = new faceapi.FaceMatcher(labels, 0.6)
        const results = resizedDetections.map(d =>
            faceMatcher.findBestMatch(d.descriptor)
        )
        if(results.length > 0){
        results.forEach(async (result, index) => {
            const { label } = result
            console.log(label)
            if (label !== "unknown") {
                let emmployee = response.data.data.filter(function (e) {
                    return e._id == label;
                });
                axios.post('https://hieutranvu.herokuapp.com/employee/face-detect', { empId: emmployee[0]._id, hotelId: emmployee[0].hotelId })
                    document.getElementById("name").innerHTML = emmployee[0].empName;
                    document.getElementById("content").innerHTML = "??i???m danh th??nh c??ng. Xin ch??o"
            } 
        })
    }
        else {
            document.getElementById("content").innerHTML = "Vui l??ng nh??n v??o m??n h??nh"
            document.getElementById("name").innerHTML = "";
        }

    }, 5000)


})