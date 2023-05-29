# create a docker file using python3 and the current folder, app.py
FROM python:3
ADD . /server
WORKDIR /server
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
