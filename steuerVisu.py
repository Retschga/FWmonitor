import fileinput

beginTime = 0
endTime   = 0

for line in fileinput.input():
    if(beginTime == 0 and " ---> Schirm AN" in line):
        beginTime = line[2:19]
        print("EIN:   ", beginTime)
    if(beginTime != 0 and " ---> Schirm AUS" in line):
        endTime = line[2:19]
        print("AUS:   ", endTime, "\n")
        beginTime = 0
        endTime = 0
